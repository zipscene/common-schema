/*
This class represents a generic schema that is stored and accessible similarly to Mongoose schemas.
The schema's format is configurable on construction to some extent.  Internally, all type names
are stored as strings, although some shorthand values are permitted (ie, String constructor is an alias
for 'string').

The way schemas are stored internally is as a hierarchy of subschemas, where each subschema has a type
and any additional information associated with that subschema:
{
	type: 'object',
	properties: {
		foo: {
			type: 'string'
		},
		bar: {
			type: 'array',
			elements: {
				type: 'date'
			}
		}
	}
}
However, schemas are encouraged to be specified in shorthand notation:
{
	foo: String,
	bar: [Date]
}
Schemas given to the Schema constructor can be a mix of shorthand and expanded notation.
*/

/*
schemaData is mongoose-formatted schema data prior to normalization.  The schema is automatically normalized
when this constructor is called.  If there are errors in the schema format, an exception of a ZSError instance
may be thrown.

Options can contain:

- allowedTypes - An array of type strings allowed to be in the schema.  The default is:
['string', 'number', 'date', 'object', 'array', 'boolean', 'mixed', 'mixedobject', 'binary', 'map', 'integer']
Additionally, any types that result from the given typeMapper are considered allowed.

- extraAllowedTypes - An array of allowed types to allow in addition to the defaults.

- typeMapper - A function that maps given types to string types.  If given, it should
be in the form function(givenType, subschema) and should return a string type, or null
if the type is not found.  If given, this overrides the default type mapper.  It need not
return string types if string types are already given.

- typeSchemaNormalizers - A map from type names to schema normalizer functions called on subschemas
of that type.  It is called at schema normalization time.  It should throw an INVALID_OBJECT
ZSError on error.  The schema normalizer functions should have the signature:
function(subschema, path, normalizeSubschema)
The subschema parameter will point to the subschema being normalized and validated.
The normalizeSubschema parameter which should be called on any subschemas of the given subschema
with the form function normalizeSubschema(subschema, path) where path should be the full path
to the subschema, including the path passed in.  The function should return the schema after
normalization, but may also return undefined if there is no normalization needed.

- dataNormalizers - A map from type names to normalizer functions.  A normalizer function
is in the form: function(value, subschema, path, schema) and should return the normalized
data value.  They may throw an exception on error.  If a normalizer function is given for
a type that has a default normalizer function, the given normalizer is applied after the
default normalizer.  function(value, subschema, path) -> newValue

- keepUnknownFields - If set to true, fields not listed in the schema are preserved on documents.
By default, unknown fields are stripped.
*/

var ZSError = require('zs-error');
var Mixed = require('./mixed');
var async = require('async');
var defaultNormalizers = require('./normalizers');
var ValidationError = require('./validation-error');

function Schema(schemaData, options) {
	if(!options) options = {};
	if(!options.allowedTypes) {
		options.allowedTypes = ['string', 'number', 'integer', 'date', 'object', 'array', 'boolean', 'mixed', 'mixedobject', 'binary', 'map'];
	}
	if(options.extraAllowedTypes) {
		options.allowedTypes = options.allowedTypes.concat(options.extraAllowedTypes);
	}
	this.data = schemaData;
	this.options = options || {};
	this._normalizeAndValidateSchemaData();
}
module.exports = Schema;

// Maps shorthand types to string type names
function defaultTypeMapper(type) {
	if(type === String) return 'string';
	else if(type === Buffer) return 'binary';
	else if(type === Number) return 'number';
	else if(type === Date) return 'date';
	else if(type === Boolean) return 'boolean';
	else if(type === Mixed) return 'mixed';
	else if(type === Object) return 'mixedobject';
	else return null;
}

// These functions normalize subschemas on construction based on type
var defaultTypeSchemaNormalizers = {
	object: function(subschema, path, normalizeSubschema) {
		if(!subschema.properties || typeof subschema.properties != 'object') throw new ZSError(ZSError.INVALID_OBJECT, 'Schema of type object must contain properties', { subschema: subschema });
		for(var key in subschema.properties) {
			subschema.properties[key] = normalizeSubschema(subschema.properties[key], path ? (path + '.properties.' + key) : ('properties.' + key));
		}
		return subschema;
	},
	array: function(subschema, path, normalizeSubschema) {
		if(!subschema.elements) throw new ZSError(ZSError.INVALID_OBJECT, 'Schema of type array must contain elements subschema', { subschema: subschema });
		subschema.elements = normalizeSubschema(subschema.elements, path ? (path + '.elements') : 'elements');
		return subschema;
	}
};

// These functions control synchronous traversal of documents according to a schema
var documentTraversers = {
	object: function(subdoc, subschema, path, traverseChild) {
		if(subdoc && typeof subdoc == 'object') {
			for(var key in subschema.properties) {
				traverseChild(subdoc[key], subschema.properties[key], path ? (path + '.' + key) : key);
			}
		}
	},
	array: function(subdoc, subschema, path, traverseChild) {
		if(Array.isArray(subdoc)) {
			var elSchema = subschema.elements;
			for(var i = 0; i < subdoc.length; i++) {
				traverseChild(subdoc[i], elSchema, path ? (path + '.' + i) : (''+i));
			}
		}
	}
};

// These functions control synchronous traversal of documents according to a schema, modifying the document as it's traversed
var documentTransformers = {
	object: function(subdoc, subschema, path, transformChild) {
		if(subdoc && typeof subdoc == 'object') {
			var newObj = {};
			for(var key in subschema.properties) {
				var result = transformChild(subdoc[key], subschema.properties[key], path ? (path + '.' + key) : key);
				if(result !== undefined) {
					newObj[key] = result;
				}
			}
			if(this.options.keepUnknownFields || subschema.keepUnknownFields) {
				for(var okey in subdoc) {
					if(!subschema.properties[okey]) {
						newObj[okey] = subdoc[okey];
					}
				}
			}
			return newObj;
		} else {
			return undefined;
		}
	},
	array: function(subdoc, subschema, path, transformChild) {
		if(Array.isArray(subdoc)) {
			var elSchema = subschema.elements;
			var newArr = [];
			for(var i = 0; i < subdoc.length; i++) {
				var result = transformChild(subdoc[i], elSchema, path ? (path + '.' + i) : (''+i));
				if(result !== undefined) {
					newArr.push(result);
				}
			}
			return newArr;
		} else {
			return undefined;
		}
	}
};

// Traverse a schema (without an associated document)
var schemaTraversers = {
	object: function(subschema, path, traverseChild) {
		for(var key in subschema.properties) {
			traverseChild(subschema.properties[key], path ? (path + '.' + key) : key);
		}
	},
	array: function(subschema, path, traverseChild) {
		traverseChild(subschema.elements, path);
	}
};


// --- Asynchronous versions of above functions ---
var asyncDocumentTraversers = {
	object: function(subdoc, subschema, path, traverseChild, done) {
		if(subdoc && typeof subdoc == 'object') {
			async.eachSeries(Object.keys(subschema.properties), function(key, next) {
				traverseChild(subdoc[key], subschema.properties[key], path ? (path + '.' + key) : key, next);
			}, done);
		} else {
			done();
		}
	},
	array: function(subdoc, subschema, path, traverseChild, done) {
		if(Array.isArray(subdoc)) {
			var elSchema = subschema.elements;
			var curIdx = 0;
			async.eachSeries(subdoc, function(subItem, next) {
				traverseChild(subItem, elSchema, path ? (path + '.' + curIdx) : (''+curIdx), next);
				curIdx++;
			}, done);
		} else {
			done();
		}
	}
};

var asyncDocumentTransformers = {
	object: function(subdoc, subschema, path, transformChild, done) {
		var schema = this;
		if(subdoc && typeof subdoc == 'object') {
			var newObj = {};
			async.eachSeries(Object.keys(subschema.properties), function(key, next) {
				transformChild(subdoc[key], subschema.properties[key], path ? (path + '.' + key) : key, function(error, result) {
					if(error) return next(error);
					if(result !== undefined) newObj[key] = result;
					next();
				});
			}, function(error) {
				if(error) return done(error);
				if(schema.options.keepUnknownFields || subschema.keepUnknownFields) {
					for(var okey in subdoc) {
						if(!subschema.properties[okey]) {
							newObj[okey] = subdoc[okey];
						}
					}
				}
				done(null, newObj);
			});
		} else {
			done(null, undefined);
		}
	},
	array: function(subdoc, subschema, path, transformChild, done) {
		if(Array.isArray(subdoc)) {
			var elSchema = subschema.elements;
			var newArr = [];
			var curIdx = 0;
			async.eachSeries(subdoc, function(subItem, next) {
				transformChild(subItem, elSchema, path ? (path + '.' + curIdx) : (''+curIdx), function(error, result) {
					if(error) return next(error);
					if(result !== undefined) newArr.push(result);
					next();
				});
				curIdx++;
			}, function(error) {
				if(error) return done(error);
				done(null, newArr);
			});
		} else {
			done(null, undefined);
		}
	}
};

// Fetch subschemas by document path
var subschemaGetters = {
	object: function(subschema, pathComponent) {
		return subschema.properties[pathComponent];
	},
	array: function(subschema, pathComponent) {
		if(/^[0-9]+/.test(pathComponent)) {
			return subschema.elements;
		} else {
			return undefined;
		}
	}
};


Schema.prototype._normalizeAndValidateSchemaData = function() {
	var options = this.options;

	function normalizeSubschema(subschema, path) {

		// If the subschema is nonexistent, ignore it.
		if(subschema === null || subschema === undefined) return undefined;

		// Determine if this subschema is in shorthand form or not
		var isSchemaExpandedNotation = (typeof subschema == 'object' && subschema && subschema.type && !Array.isArray(subschema));
		if(!isSchemaExpandedNotation) {
			// The schema is just a type, so convert it into expanded notation
			subschema = { type: subschema };
		}

		// If the type is in shorthand object or shorthand array form, convert to full expanded form
		if(Array.isArray(subschema.type)) {
			if(subschema.type.length != 1) throw new ZSError(ZSError.INVALID_OBJECT, 'Invalid schema.  Shorthand arrays must contain exactly 1 element.', { subschema: subschema });
			subschema.elements = subschema.type[0];
			subschema.type = 'array';
		} else if(subschema.type && typeof subschema.type == 'object') {
			subschema.properties = subschema.type;
			subschema.type = 'object';
		}

		// Run the default type mapper and given type mapper on the given type to convert shorthand types to string types
		var newType, newTypeFromTypeMapper;
		if(options.typeMapper) newType = options.typeMapper(subschema.type, subschema);
		if(newType) {
			subschema.type = newType;
			newTypeFromTypeMapper = true;
		} else {
			newType = defaultTypeMapper(subschema.type, subschema);
			if(newType) {
				subschema.type = newType;
			}
		}

		// Make sure the given type is a string and is allowed
		if(typeof subschema.type != 'string') throw new ZSError(ZSError.INVALID_OBJECT, 'Invalid schema.  Type must either be a string or one of the recognized shorthand types.', { givenType: subschema.type });
		if(!newTypeFromTypeMapper && options.allowedTypes.indexOf(subschema.type) == -1) throw new ZSError(ZSError.INVALID_OBJECT, 'Invalid schema.  Given type is not recognized or disallowed.', { givenType: subschema.type });

		// Run default type schema normalizers on the type
		var typeNormResult;
		if(defaultTypeSchemaNormalizers[subschema.type]) {
			typeNormResult = defaultTypeSchemaNormalizers[subschema.type](subschema, path, normalizeSubschema);
			if(typeNormResult !== undefined) subschema = typeNormResult;
		}
		if(options.typeSchemaNormalizers && options.typeSchemaNormalizers[subschema.type]) {
			typeNormResult = options.typeSchemaNormalizers[subschema.type](subschema, path, normalizeSubschema);
			if(typeNormResult !== undefined) subschema = typeNormResult;
		}

		// Check if the schema contains a schema normalization function for itself
		if(typeof subschema.normalizeSchema == 'function') {
			typeNormResult = subschema.normalizeSchema(subschema, path, normalizeSubschema);
			if(typeNormResult !== undefined) subschema = typeNormResult;
		}

		// Return the resulting normalized schema
		return subschema;
	}

	this.data = normalizeSubschema(this.data, '');
};

Schema.prototype.getData = function() {
	return this.data;
};

// Calls callback(subdoc, subschema, path) for each entry in the document corresponding to a schema entry
Schema.prototype.traverseDoc = function(doc, callback) {
	var schema = this;
	function traverse(subdoc, subschema, path) {
		if(!subschema || !subschema.type) return;
		callback(subdoc, subschema, path);
		if(subdoc === undefined) return;
		if(typeof subschema.schemaTraverse == 'function') {
			subschema.schemaTraverse.call(schema, subdoc, subschema, path, traverse);
		} else if(documentTraversers[subschema.type]) {
			documentTraversers[subschema.type].call(schema, subdoc, subschema, path, traverse);
		}
	}
	traverse(doc, this.data, '');
};

// As with traverseDoc, calls callback(subdoc, subschema, path) and sets the return value of callback to the value in the document
// Returns the new document
Schema.prototype.transformDoc = function(doc, callback) {
	var schema = this;
	function transform(subdoc, subschema, path) {
		if(!subschema || !subschema.type) return undefined;
		var newValue = callback(subdoc, subschema, path);
		if(newValue === undefined) return newValue;
		if(typeof subschema.schemaTransform == 'function') {
			newValue = subschema.schemaTransform.call(schema, subdoc, subschema, path, transform);
		} else if(documentTransformers[subschema.type]) {
			newValue = documentTransformers[subschema.type].call(schema, subdoc, subschema, path, transform);
		}
		return newValue;
	}
	return transform(doc, this.data, '');
};

// Traverses the schema without an associated document
Schema.prototype.traverseSchema = function(callback) {
	function traverse(subschema, path) {
		if(!subschema || !subschema.type) return;
		callback(subschema, path);
		if(typeof subschema.schemaTraverseSchema == 'function') {
			subschema.schemaTraverseSchema(subschema, path, traverse);
		} else if(schemaTraversers[subschema.type]) {
			schemaTraversers[subschema.type](subschema, path, traverse);
		}
	}
	traverse(this.data, '');
};

Schema.prototype.traverseDocAsync = function(doc, callback, done) {
	var schema = this;
	function traverse(subdoc, subschema, path, done) {
		if(!subschema || !subschema.type) return done();
		callback(subdoc, subschema, path, function(error) {
			if(error) return done(error);
			if(subdoc === undefined) return done();
			if(typeof subschema.schemaTraverseAsync == 'function') {
				subschema.schemaTraverseAsync.call(schema, subdoc, subschema, path, traverse, done);
			} else if(asyncDocumentTraversers[subschema.type]) {
				asyncDocumentTraversers[subschema.type].call(schema, subdoc, subschema, path, traverse, done);
			} else {
				done();
			}
		});
	}
	traverse(doc, this.data, '', done);
};

Schema.prototype.transformDocAsync = function(doc, callback, done) {
	var schema = this;
	function transform(subdoc, subschema, path, done) {
		if(!subschema || !subschema.type) return done(null, undefined);
		callback(subdoc, subschema, path, function(error, newValue) {
			if(error) return done(error);
			if(newValue === undefined) return done(null, newValue);
			if(typeof subschema.schemaTransformAsync == 'function') {
				subschema.schemaTransformAsync.call(schema, newValue, subschema, path, transform, done);
			} else if(asyncDocumentTransformers[subschema.type]) {
				asyncDocumentTransformers[subschema.type].call(schema, newValue, subschema, path, transform, done);
			} else {
				done(null, newValue);
			}
		});
	}
	transform(doc, this.data, '', done);
};

// Returns the subschema that corresponds to a document path
Schema.prototype.getSubschema = function(docPath) {
	if(!docPath) return this.data;
	var cur = this.data;
	var components = docPath.split('.');
	for(var i = 0; i < components.length; i++) {
		var component = components[i];
		if(typeof cur.getSubschema == 'function') {
			cur = cur.getSubschema(cur, component);
		} else if(subschemaGetters[cur.type]) {
			cur = subschemaGetters[cur.type](cur, component);
		} else {
			return null;
		}
		if(!cur) return null;
	}
	return cur;
};

Schema.prototype.transformDocTypes = function(doc, transformers) {
	return this.transformDoc(doc, function(subdoc, subschema, path) {
		if(transformers[subschema.type]) {
			return transformers[subschema.type](subdoc, subschema, path);
		} else {
			return subdoc;
		}
	});
};

function commonValidate(value, subschema, path) {
	if(subschema.required && (value === null || value === undefined || value === '')) {
		throw new ValidationError('Field is required', path);
	}
}

Schema.prototype.normalizeDoc = function(doc) {
	var schema = this;
	var extraNormalizers = this.dataNormalizers || {};
	return this.transformDoc(doc, function(value, subschema, path) {
		var type = subschema.type;
		var isPresent = value !== null && value !== undefined;
		if(!isPresent && subschema['default']) {
			value = subschema['default'];
		}
		if(typeof subschema.prevalidate === 'function' && isPresent) {
			subschema.prevalidate(value, subschema, path, schema);
		}
		if(defaultNormalizers[type] && isPresent) {
			value = defaultNormalizers[type](value, subschema, path, schema);
		}
		if(typeof subschema.schemaNormalizeValue === 'function' && isPresent) {
			value = subschema.schemaNormalizeValue(value, subschema, path, schema);
		}
		if(extraNormalizers[type] && isPresent) {
			value = extraNormalizers[type](value, subschema, path, schema);
		}
		if(typeof subschema.validate === 'function' && isPresent) {
			subschema.validate(value, subschema, path, schema);
		}
		if(typeof subschema.normalize === 'function' && isPresent) {
			value = subschema.normalize(value, subschema, path, schema);
		}
		commonValidate(value, subschema, path, schema);
		return value;
	});
};

Schema.prototype.validateDoc = Schema.prototype.normalizeDoc;
