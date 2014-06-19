var $ = require('zs-jq-stub');
var ZSError = require('zs-error');
var async = require('async');

// Mixed type, as in mongoose
function Mixed() { }
exports.Mixed = Mixed;

/**
 * Normalizes a generic mongoose-style schema.
 * @param schema object The input schema to normalize
 * @param typeMapper Function Optional function to map the original schema type to the resultant
 * type name.  Only called for non-object types.  The function has the signature function(origType, schema)
 * and should return the resultant type or null on error.
 * @param traverseHook Function Optional function to call at each schema level.  It has the signature
 * function(subSchema, path) .  It can return non-null on error.
 * @return object The normalize schema or an instanceof ZSError.
 */
function normalizeSchema(schema, typeMapper, traverseHook) {
	var error;
	schema = $.extend(true, {}, schema);

	if(!typeMapper) {
		typeMapper = function(type, schema) {
			if(schema.type === String || schema.type === 'string') return 'string';
			else if(schema.type === Buffer || schema.type === 'binary') return 'binary';
			else if(schema.type === Number || schema.type === 'number') return 'number';
			else if(schema.type === Date || schema.type === 'date') return 'date';
			else if(schema.type === Boolean || schema.type === 'boolean') return 'boolean';
			else if(schema.type === Mixed || schema.type === 'mixed') return 'mixed';
			else return null;
		};
	}

	function normalize(schema, curPath) {
		if(schema === undefined || schema === null) return schema;
		if(Array.isArray(schema) || typeof schema != 'object' || !schema.type) {
			schema = { type: schema };
		}

		// Map constructor types to string types
		if(Array.isArray(schema.type)) {
			if(schema.type.length != 1) {
				error = new ZSError(ZSError.INTERNAL_ERROR, 'Invalid schema type - array must have 1 element', { schema: schema });
			} else {
				schema.type[0] = normalize(schema.type[0], curPath ? (curPath + '.0') : '0');
			}
		} else if(typeof schema.type == 'object') {
			Object.keys(schema.type).forEach(function(key) {
				schema.type[key] = normalize(schema.type[key], curPath ? (curPath + '.' + key) : key);
			});
		} else {
			var mappedType = typeMapper(schema.type, schema);
			if(!mappedType) error = new ZSError(ZSError.INTERNAL_ERROR, 'Invalid schema type ' + schema.type, { schema: schema});
			schema.type = mappedType;
		}

		if(traverseHook) {
			var hookError = traverseHook(schema, curPath);
			if(hookError) error = hookError;
		}

		return schema;
	}

	schema = normalize(schema, '');
	if(error) return error;
	return schema;
}

exports.normalizeSchema = normalizeSchema;

// Finds all schema fields that have a given setting set.
// The return value is a map from path (to the field) to the setting value.
function getSchemaFieldsWithSetting(schema, setting, value) {
	var fields = {};
	function find(schema, path) {
		if(schema[setting]) {
			if(value !== undefined) {
				if(schema[setting] === value) {
					fields[path] = schema[setting];
				}
			} else {
				fields[path] = schema[setting];
			}
		}
		if(Array.isArray(schema.type)) {
			find(schema.type[0], path);
		} else if(typeof schema.type == 'object') {
			Object.keys(schema.type).forEach(function(key) {
				var subschema = schema.type[key];
				find(subschema, path ? (path+'.'+key) : key);
			});
		}
	}
	find(schema, '');
	return fields;
}

exports.getSchemaFieldsWithSetting = getSchemaFieldsWithSetting;

function getSubschema(schema, path, skipArrays) {
	if(!schema) return schema;
	if(!path || !path.length) {
		if(skipArrays && Array.isArray(schema.type)) {
			return schema.type[0];
		} else {
			return schema;
		}
	}
	if(!Array.isArray(path)) path = path.split('.');
	if(typeof schema.type != 'object' || !schema.type) return null;
	if(Array.isArray(schema.type) && schema.type.length == 1) {
		if(skipArrays || !(/^[0-9]+$/.test(path[0]))) {
			return getSubschema(schema.type[0], path);
		} else {
			return getSubschema(schema.type[0], path.slice(1));
		}
	} else {
		return getSubschema(schema.type[path[0]], path.slice(1));
	}
}

exports.getSubschema = getSubschema;

function traverseDocSync(doc, schema, handler) {
	function traverse(val, schema, path) {
		if(!schema || typeof schema != 'object' || !schema.type) throw new ZSError(ZSError.INTERNAL_ERROR, 'Invalid schema for validation', { schema: schema });

		if(Array.isArray(schema.type)) {
			if(Array.isArray(val)) {
				handler(val, schema, path);
				val.forEach(function(el, idx) {
					traverse(el, schema.type[0], path + '.' + idx);
				});
			} else {
				traverse(val, schema.type[0], path);
			}
		} else if(typeof schema.type == 'object') {
			if(val && typeof val == 'object') {
				handler(val, schema, path);
				Object.keys(schema.type).forEach(function(objKey) {
					if(val[objKey] !== null && val[objKey] !== undefined) {
						traverse(val[objKey], schema.type[objKey], path + '.' + objKey);
					}
				});
			}
		} else {
			if(val !== null && val !== undefined) {
				handler(val, schema, path);
			}
		}
	}
	traverse(doc, schema, '');
}
exports.traverseDocSync = traverseDocSync;

function traverseDoc(doc, schema, handler, cb) {

	function traverse(val, schema, path, cb) {
		async.stackSafe(function() {
			if(!schema || typeof schema != 'object' || !schema.type) return cb(new ZSError(ZSError.INTERNAL_ERROR, 'Invalid schema for validation', { schema: schema }));

			if(Array.isArray(schema.type)) {
				if(Array.isArray(val)) {
					handler(val, schema, path, function(error, replacement) {
						if(error) return cb(error);
						if(replacement !== undefined) val = replacement;
						if(!Array.isArray(val)) return cb(null, val);
						var curIdx = -1;
						async.eachSeries(val, function(el, cb) {
							curIdx++;
							traverse(el, schema.type[0], path + '.' + curIdx, function(error, replacement) {
								if(error) return cb(error);
								if(replacement !== undefined) {
									val[curIdx] = replacement;
								}
								cb();
							});
						}, function(error) {
							if(error) return cb(error);
							cb(null, val);
						});
					});
				} else {
					traverse(val, schema.type[0], path, cb);
				}
			} else if(typeof schema.type == 'object') {
				if(val && typeof val == 'object') {
					handler(val, schema, path, function(error, replacement) {
						if(error) return cb(error);
						if(replacement !== undefined) val = replacement;
						if(!val) return cb(null, val);

						async.eachSeries(Object.keys(schema.type), function(objKey, cb) {
							if(val[objKey] !== null && val[objKey] !== undefined) {
								traverse(val[objKey], schema.type[objKey], path + '.' + objKey, function(error, replacement) {
									if(error) return cb(error);
									if(replacement !== undefined) {
										val[objKey] = replacement;
									}
									cb();
								});
							} else {
								cb();
							}
						}, function(error) {
							if(error) return cb(error);
							cb(null, val);
						});
					});
				} else {
					cb();
				}
			} else {
				if(val !== null && val !== undefined) {
					handler(val, schema, path, cb);
				} else {
					cb();
				}
			}
		});
	}

	traverse(doc, schema, '', cb);
}
exports.traverseDoc = traverseDoc;

/**
 * Validates a document according to a schema.  Also transforms the document
 * into a normalized form based on the schema.
 *
 * @param doc object Input document
 * @param schema object Normalized schema
 * @param options object Optional options.  Currently only option is 'typeValidations' which
 * is a map from type to validator function (see how it's used below).  Also can use option
 * 'ignoreRequired' which ignores required validation errors.
 * @return mixed The transformed document, or an instance of ZSError
 */
function validateAndTransform(doc, schema, options) {
	var fieldErrors = [];
	var invalidMessages = [];
	if(!options) options = {};

	function traverse(val, schema, path) {
		var origVal = val;

		function invalid(type, message) {
			fieldErrors.push( { field: path, errorType: type, message: message } );
			invalidMessages.push('Invalid value for ' + path + ': ' + message);
			return val;
		}

		// Check basic schema validity
		if(!schema || typeof schema != 'object' || !schema.type) return new ZSError(ZSError.INTERNAL_ERROR, 'Invalid schema for validation', { schema: schema });

		// Check restricted field
		if(val !== undefined && schema.restricted) {
			return invalid('restricted', 'This field is restricted and cannot be set');
		}

		// Get the type string
		var typeString;
		if(Array.isArray(schema.type)) typeString = 'array';
		else if(typeof schema.type == 'object') typeString = 'object';
		else typeString = schema.type;

		// Check if required and add default value
		if(val === undefined || val === null || val === '') {
			if(schema.default !== undefined) val = schema.default;
			else if(schema.required && !options.ignoreRequired) return invalid('required', 'This field is required');
			// If the type is an object, treat as empty object so default fields get filled in
			if(typeString == 'object') val = {};
			if(val === undefined || val === null) return val;
		}

		function validateString(val, schema, invalidate) {
			if(typeof val == 'number' || typeof val == 'boolean') val = '' + val;
			if(typeof val != 'string') return invalidate('wrong_type', 'Must be a string');
			return val;
		}

		function validateNumber(val, schema, invalidate) {
			if(typeof val == 'string') {
				if(!/^-?\d*(\.\d+)?$/.test(val) || !val.length) return invalidate('wrong_type', 'Must be a number');
				val = parseFloat(val);
				if(isNaN(val)) return invalidate('wrong_type', 'Must be a number');
			}
			if(typeof val != 'number') return invalidate('wrong_type', 'Must be a number');
			return val;
		}

		function validateInteger(val, schema, invalidate) {
			if(typeof val == 'string') {
				if(!/^-?[0-9]+$/.test(val)) return invalidate('wrong_type', 'Must be an integer');
				val = parseInt(val, 10);
				if(isNaN(val)) return invalidate('wrong_type', 'Must be an integer');
			}
			if(typeof val != 'number') return invalidate('wrong_type', 'Must be an integer');
			val = Math.floor(val);
			return val;
		}

		function validateBoolean(val, schema, invalidate) {
			if(typeof val == 'string') {
				val = val.toLowerCase();
				if(val == 'true' || val == 't' || val == '1' || val == 'on' || val == 'yes') val = true;
				else if(val == 'false' || val == 'f' || val == '0' || val == 'off' || val == 'no') val = false;
				else return invalidate('wrong_type', 'Must be boolean');
			} else if(typeof val == 'number') {
				val = !!val;
			}
			if(typeof val != 'boolean') return invalidate('wrong_type', 'Must be boolean');
			return val;
		}

		function validateDate(val, schema, invalidate) {
			if(typeof val == 'string') {
				val = Date.parse(val);
				if(isNaN(val)) return invalidate('invalid', 'Must be a valid date');
				val = new Date(val);
			} else if(typeof val == 'number') {
				val = new Date(val);
			}
			if(!(val instanceof Date)) return invalidate('wrong_type', 'Must be a date');
			return val;
		}

		function validateMixed(val, schema, invalidate) {
			if(typeof val != 'object') return invalidate('wrong_type', 'Must be object');
			return val;
		}

		function validateObject(val, schema, invalidate) {
			if(typeof val != 'object') return invalidate('wrong_type', 'Must be an object');
			var resultObject = {};
			var keyError;
			Object.keys(schema.type).forEach(function(key) {
				var r = traverse(val[key], schema.type[key], path ? (path + '.' + key) : key);
				if(r instanceof ZSError) keyError = r;
				else if(r !== undefined) resultObject[key] = r;
			});
			if(keyError) return keyError;
			if(schema.keepUnknownFields) {
				Object.keys(val).forEach(function(key) {
					if(schema.type[key] === undefined) {
						resultObject[key] = val[key];
					}
				});
			}
			return resultObject;
		}

		function validateArray(val, schema) {
			if(schema.type.length != 1) return new ZSError(ZSError.INTERNAL_ERROR, 'Invalid schema for validator - array must have 1 element', { schema: schema } );
			if(!Array.isArray(val)) val = [val];
			var elError;
			val = val.map(function(el, idx) {
				var r = traverse(el, schema.type[0], path ? (path + '.' + idx) : (''+idx));
				if(r instanceof ZSError) elError = r;
				return r;
			});
			if(elError) return elError;
			return val;
		}

		var typeValidations = {
			'string': validateString,
			'number': validateNumber,
			'double': validateNumber,
			'float': validateNumber,
			'byte': validateInteger,
			'short': validateInteger,
			'integer': validateInteger,
			'long': validateInteger,
			'boolean': validateBoolean,
			'date': validateDate,
			'mixed': validateMixed,
			'object': validateObject,
			'array': validateArray
		};

		// Merge type validations with validations from options
		if(options.typeValidations) {
			Object.keys(options.typeValidations).forEach(function(type) {
				if(typeValidations[type]) {
					if(Array.isArray(typeValidations[type])) {
						if(Array.isArray(options.typeValidations[type])) {
							typeValidations[type].push.apply(typeValidations[type], options.typeValidations[type]);
						} else {
							typeValidations[type].push(options.typeValidations[type]);
						}
					} else {
						if(Array.isArray(options.typeValidations[type])) {
							typeValidations[type] = [typeValidations[type]].concat(options.typeValidations[type]);
						} else {
							typeValidations[type] = [typeValidations[type], options.typeValidations[type]];
						}
					}
				} else {
					typeValidations[type] = options.typeValidations[type];
				}
			});
		}

		// Validate based on type
		if(typeValidations[typeString]) {
			var vError;
			(Array.isArray(typeValidations[typeString]) ? typeValidations[typeString] : [typeValidations[typeString]]).forEach(function(validator) {
				var res = validator(val, schema, invalid);
				if(res instanceof ZSError) vError = res;
				else val = res;
			});
			if(vError) return vError;
		} else {
			return new ZSError(ZSError.INTERNAL_ERROR, 'Invalid schema for validator - unrecognized type', { schema: schema });
		}

		// If we processed an object type for the sole purpose to find defaults, and there were no defaults, return null
		if((origVal === null || origVal === undefined) && typeString == 'object' && !Object.keys(val).length) {
			return origVal;
		}

		// If there's an enum, make sure it's a valid value
		if(schema.enum) {
			if(!Array.isArray(schema.enum)) return new ZSError(ZSError.INTERNAL_ERROR, 'Invalid schema for validator - enum must be array', { schema: schema });
			if(val !== null && val !== undefined && schema.enum.indexOf(val) === -1) {
				return invalid('invalid', 'Must be one of: ' + schema.enum.join(', '));
			}
		}

		// Return the value after transformation
		return val;
	}

	var result = traverse(doc, schema, '');
	if(result instanceof ZSError) return result;
	if(fieldErrors.length || invalidMessages.length) return new ZSError(ZSError.INVALID_OBJECT, invalidMessages.length ? invalidMessages.join(', ') : 'Validation failed', { fieldErrors: fieldErrors, messages: invalidMessages } );
	return result;
}
exports.validateAndTransform = validateAndTransform;
