let SchemaType = require('./schema-type');
let SchemaError = require('./schema-error');
let FieldError = require('./field-error');
let ValidationError = require('./validation-error');
let Mixed = require('./mixed');
let _ = require('lodash');
let objtools = require('zs-objtools');

class SchemaTypeObject extends SchemaType {

	constructor(name) {
		super(name || 'object');
	}

	matchShorthandType(subschema) {
		return _.isPlainObject(subschema);
	}

	traverseSchema(subschema, path, handlers, schema, options) {
		for (let prop in subschema.properties) {
			schema._traverseSubschema(
				subschema.properties[prop],
				path ? (path + '.' + prop) : prop,
				handlers,
				options
			);
		}
	}

	getFieldSubschema(subschema, pathComponent, schema) {
		return subschema.properties[pathComponent];
	}

	normalizeShorthandSchema(subschema, schema) {
		if (_.isPlainObject(subschema.type)) {
			subschema.properties = subschema.type;
		}
		return subschema;
	}

	normalizeSchema(subschema, schema) {
		if (!_.isPlainObject(subschema.properties)) {
			throw new SchemaError('Object in schema must have properties field');
		}
		for (let prop in subschema.properties) {
			subschema.properties[prop] = schema._normalizeSubschema(subschema.properties[prop]);
		}
		return subschema;
	}

	traverse(value, subschema, field, handlers, schema) {
		for (let prop in subschema.properties) {
			schema._traverseSubschemaValue(
				value[prop],
				subschema.properties[prop],
				field ? (field + '.' + prop) : prop,
				handlers
			);
		}
		for (let prop in value) {
			if (!(prop in subschema.properties)) {
				schema._traverseSubschemaValue(
					value[prop],
					undefined,
					field ? (field + '.' + prop) : prop,
					handlers
				);
			}
		}
	}

	transform(value, subschema, field, handlers, schema) {
		for (let prop in subschema.properties) {
			let newValue = schema._transformSubschemaValue(
				value[prop],
				subschema.properties[prop],
				field ? (field + '.' + prop) : prop,
				handlers
			);
			if (newValue === undefined) {
				delete value[prop];
			} else {
				value[prop] = newValue;
			}
		}
		for (let prop in value) {
			if (!(prop in subschema.properties)) {
				let newValue = schema._transformSubschemaValue(
					value[prop],
					undefined,
					field ? (field + '.' + prop) : prop,
					handlers
				);
				if (newValue === undefined) {
					delete value[prop];
				} else {
					value[prop] = newValue;
				}
			}
		}
		return value;
	}

	transformAsync(value, subschema, field, handlers, schema) {
		return Promise.all(_.map(_.union(_.keys(subschema.properties), _.keys(value)), function(prop) {
			return schema._transformSubschemaValueAsync(
				value[prop],
				subschema.properties[prop],
				field ? (field + '.' + prop) : prop,
				handlers
			).then(function(newValue) {
				if (newValue === undefined) {
					delete value[prop];
				} else {
					value[prop] = newValue;
				}
			});
		})).then( () => value );
	}

	validate(value) {
		if (!_.isPlainObject(value)) {
			throw new FieldError('invalid_type', 'Must be an object');
		}
	}

	normalize(value, subschema, field, options, schema) {
		this.validate(value, subschema, field, options, schema);
		return value;
	}

	checkTypeMatch(value) {
		return (_.isPlainObject(value) ? 1 : 0);
	}

}
exports.SchemaTypeObject = SchemaTypeObject;

class SchemaTypeArray extends SchemaType {

	constructor(name) {
		super(name || 'array');
	}

	matchShorthandType(subschema) {
		return (Array.isArray(subschema) && subschema.length === 1);
	}

	traverseSchema(subschema, path, handlers, schema, options) {
		let newPath;
		if (options.includePathArrays) {
			newPath = path ? (path + '.$') : '$';
		} else {
			newPath = path;
		}
		schema._traverseSubschema(
			subschema.elements,
			newPath,
			handlers,
			options
		);
	}

	getFieldSubschema(subschema, pathComponent, schema) {
		// We include the extra values here so this function can work with various standard
		// array index placeholders.  If used to index into an actual array object, they'll
		// return undefined.
		if (
			!isNaN(pathComponent) ||
			pathComponent === '$' ||
			pathComponent === '#' ||
			pathComponent === '_' ||
			pathComponent === '*'
		) {
			return subschema.elements;
		} else {
			return undefined;
		}
	}

	normalizeSchema(subschema, schema) {
		if (!subschema.elements) {
			throw new SchemaError('Array schema must have elements field');
		}
		subschema.elements = schema._normalizeSubschema(subschema.elements);
		return subschema;
	}

	normalizeShorthandSchema(subschema, schema) {
		if (this.matchShorthandType(subschema.type)) {
			subschema.elements = subschema.type[0];
		}
		return subschema;
	}

	traverse(value, subschema, field, handlers, schema) {
		for (let i = 0; i < value.length; i++) {
			schema._traverseSubschemaValue(
				value[i],
				subschema.elements,
				field ? (field + '.' + i) : ('' + i),
				handlers
			);
		}
	}

	transform(value, subschema, field, handlers, schema) {
		let hasDeletions = false;
		for (let i = 0; i < value.length; i++) {
			value[i] = schema._transformSubschemaValue(
				value[i],
				subschema.elements,
				field ? (field + '.' + i) : ('' + i),
				handlers
			);
			if (value[i] === undefined) {
				hasDeletions = true;
			}
		}
		if (hasDeletions) {
			return _.filter(value, elem => elem !== undefined);
		} else {
			return value;
		}
	}

	transformAsync(value, subschema, field, handlers, schema) {
		let hasDeletions = false;
		return Promise.all(_.map(value, function(elem, i) {
			return schema._transformSubschemaValueAsync(
				elem,
				subschema.elements,
				field ? (field + '.' + i) : ('' + i),
				handlers
			).then(function(newElem) {
				value[i] = newElem;
				if (newElem === undefined) {
					hasDeletions = true;
				}
			});
		})).then(function() {
			if (hasDeletions) {
				return _.filter(value, elem => elem !== undefined);
			} else {
				return value;
			}
		});
	}

	validate(value) {
		if (!_.isArray(value)) {
			throw new FieldError('invalid_type', 'Must be an array');
		}
		for (let elem of value) {
			if (elem === undefined) {
				throw new FieldError('invalid', 'Arrays may not contain undefined elements');
			}
		}
	}

	normalize(value, subschema, field, options, schema) {
		this.validate(value, subschema, field, options, schema);
		return value;
	}

	checkTypeMatch(value) {
		return (_.isArray(value) ? 1 : 0);
	}

}
exports.SchemaTypeArray = SchemaTypeArray;

class SchemaTypeMap extends SchemaType {

	constructor(name) {
		super(name || 'map');
	}

	matchShorthandType(subschema) {
		return false;
	}

	traverseSchema(subschema, path, handlers, schema, options) {
		let newPath;
		if (options.includePathArrays) {
			newPath = path ? (path + '.$') : '$';
		} else {
			newPath = path;
		}
		schema._traverseSubschema(
			subschema.values,
			newPath,
			handlers,
			options
		);
	}

	getFieldSubschema(subschema, pathComponent, schema) {
		return subschema.values;
	}

	normalizeSchema(subschema, schema) {
		if (!subschema.values) {
			throw new SchemaError('Map schema must have values field');
		}
		subschema.values = schema._normalizeSubschema(subschema.values);
		return subschema;
	}

	traverse(value, subschema, field, handlers, schema) {
		for (let prop in value) {
			schema._traverseSubschemaValue(
				value[prop],
				subschema.values,
				field ? (field + '.' + prop) : prop,
				handlers
			);
		}
	}

	transform(value, subschema, field, handlers, schema) {
		for (let prop in value) {
			let newValue = schema._transformSubschemaValue(
				value[prop],
				subschema.values,
				field ? (field + '.' + prop) : prop,
				handlers
			);
			if (newValue === undefined) {
				delete value[prop];
			} else {
				value[prop] = newValue;
			}
		}
		return value;
	}

	transformAsync(value, subschema, field, handlers, schema) {
		return Promise.all(_.map(_.keys(value), function(prop) {
			return schema._transformSubschemaValueAsync(
				value[prop],
				subschema.values,
				field ? (field + '.' + prop) : prop,
				handlers
			).then(function(newValue) {
				if (newValue === undefined) {
					delete value[prop];
				} else {
					value[prop] = newValue;
				}
			});
		})).then( () => value );
	}

	validate(value) {
		if (!_.isPlainObject(value)) {
			throw new FieldError('invalid_type', 'Must be an object');
		}
	}

	normalize(value, subschema, field, options, schema) {
		this.validate(value, subschema, field, options, schema);
		return value;
	}

	checkTypeMatch(value) {
		return (_.isPlainObject(value) ? 1 : 0);
	}

}
exports.SchemaTypeMap = SchemaTypeMap;

class SchemaTypeOr extends SchemaType {

	constructor(name) {
		super(name || 'or');
	}

	matchShorthandType(subschema) {
		return false;
	}

	traverseSchema(subschema, path, handlers, schema, options) {
		for (let alt of subschema.alternatives) {
			schema._traverseSubschema(
				alt,
				path,
				handlers,
				options
			);
		}
	}

	getFieldSubschema(subschema, pathComponent, schema) {
		// We don't have a whole lot of information to go off of here, so just return the
		// first alternative that returns a non-undefined subschema.
		for (let alt of subschema.alternatives) {
			let type = schema._getType(alt.type);
			let altSubcomponent = type.getFieldSubschema(alt, pathComponent, schema);
			if (altSubcomponent !== undefined) {
				return altSubcomponent;
			}
		}
		return undefined;
	}

	normalizeSchema(subschema, schema) {
		if (!Array.isArray(subschema.alternatives)) {
			throw new SchemaError('Or schema must have alternatives field');
		}
		if (subschema.alternatives.length < 2) {
			throw new SchemaError('Or schema must have at least 2 options');
		}
		for (let i = 0; i < subschema.alternatives.length; i++) {
			subschema.alternatives[i] = schema._normalizeSubschema(subschema.alternatives[i]);
		}
		return subschema;
	}

	traverse(value, subschema, field, handlers, schema) {
		let altSchema = this._matchAlternative(value, subschema, schema);
		schema._traverseSubschemaValue(
			value,
			altSchema,
			field,
			handlers
		);
	}

	transform(value, subschema, field, handlers, schema) {
		let altSchema = this._matchAlternative(value, subschema, schema);
		let newValue = schema._transformSubschemaValue(
			value,
			altSchema,
			field,
			handlers
		);
		return newValue;
	}

	transformAsync(value, subschema, field, handlers, schema) {
		let altSchema = this._matchAlternative(value, subschema, schema);
		return schema._transformSubschemaValueAsync(
			value,
			altSchema,
			field,
			handlers
		);
	}

	// Returns the subschema that best matches
	_matchAlternative(value, subschema, schema) {
		// Get types and type match values for each alternative, and group by
		// type match value.
		let alternativesByTypeMatch = {
			0: [],
			1: [],
			2: [],
			3: []
		};
		for (let alt of subschema.alternatives) {
			let type = schema._getType(alt.type);
			let typeMatch = type.checkTypeMatch(value, alt, schema);
			alternativesByTypeMatch[typeMatch].push(alt);
		}
		// Find the best matching alternative.
		let tiebreakers;
		for (let i = 3; i > 0; i--) {
			if (alternativesByTypeMatch[i].length === 1) {
				return alternativesByTypeMatch[i][0];
			} else if (alternativesByTypeMatch[i].length >= 2) {
				tiebreakers = alternativesByTypeMatch[i];
				break;
			}
		}
		if (!tiebreakers) {
			// No valid matches found.  Just return the first alternative (alternatives
			// should be listed in order of preference)
			return subschema.alternatives[0];
		}
		// Multiple alternatives match equally well.  Check for any alternatives that
		// strictly validate.
		for (let alt of tiebreakers) {
			try {
				schema._createSubschema(alt).validate(value);
				return alt;
			} catch (ex) {
				if (!ValidationError.isValidationError(ex)) {
					throw ex;
				}
			}
		}
		// Nothing strictly validates, so see if anything will normalize to the alternative.
		for (let alt of tiebreakers) {
			try {
				schema._createSubschema(alt).normalize(objtools.deepCopy(value));
				return alt;
			} catch (ex) {
				if (!ValidationError.isValidationError(ex)) {
					throw ex;
				}
			}
		}
		// Still nothing validates :(  Time for a last resort.
		for (let alt of tiebreakers) {
			try {
				schema._createSubschema(alt).normalize(objtools.deepCopy(value), {
					allowUnknownFields: true
				});
				return alt;
			} catch (ex) {
				if (!ValidationError.isValidationError(ex)) {
					throw ex;
				}
			}
		}
		// Still couldn't find a match.  Give up.
		return tiebreakers[0];
	}

	checkTypeMatch(value, subschema) {
		// Find the max match value of any of the alternatives
		let maxTypeMatch = 0;
		for (let alt of subschema.alternatives) {
			let type = schema._getType(alt.type);
			let typeMatch = type.checkTypeMatch(value, alt, schema);
			if (typeMatch > maxTypeMatch) {
				maxTypeMatch = typeMatch;
			}
		}
		return maxTypeMatch;
	}

}
exports.SchemaTypeOr = SchemaTypeOr;

class SchemaTypePrimitive extends SchemaType {

	constructor(name, shorthands) {
		super(name);
		this._shorthands = shorthands || [];
	}

	getFieldSubschema(subschema, pathComponent, schema) {
		return undefined;
	}

	matchShorthandType(subschema) {
		return this._shorthands.indexOf(subschema) !== -1;
	}

	normalizeShorthandSchema(subschema, schema) {
		return subschema;
	}

	normalizeSchema(subschema) {
		return subschema;
	}

	validate(...args) {
		this.normalize(...args);
	}

}

class SchemaTypeString extends SchemaTypePrimitive {

	constructor(name) {
		super(name || 'string', [ String ]);
	}

	normalizeSchema(subschema, schema) {
		subschema = super.normalizeSchema(subschema, schema);
		if (subschema.match instanceof RegExp) {
			subschema.match = subschema.match.toString().slice(1, -1);
		}
		return subschema;
	}

	normalize(value, subschema) {
		let strValue = '' + value;
		if (_.isNumber(subschema.maxLength) && strValue.length > subschema.maxLength) {
			throw new FieldError('too_long', subschema.maxLengthError || 'String is too long');
		}
		if (_.isNumber(subschema.minLength) && strValue.length < subschema.minLength) {
			throw new FieldError('too_short', subschema.minLengthError || 'String is too short');
		}
		if (_.isString(subschema.match) && !new RegExp(subschema.match).test(strValue)) {
			throw new FieldError(
				'invalid_format',
				subschema.matchError || 'Invalid format',
				{ regex: subschema.match }
			);
		}
		return strValue;
	}

	validate(value, ...args) {
		if (!_.isString(value)) {
			throw new FieldError('invalid_type', 'Must be a string');
		}
		super.validate(value, ...args);
	}

	checkTypeMatch(value) {
		if (_.isString(value)) {
			return 3;
		} else if (!_.isObject(value)) {
			return 2;
		} else {
			return 0;
		}
	}

}
exports.SchemaTypeString = SchemaTypeString;

class SchemaTypeNumber extends SchemaTypePrimitive {

	constructor(name) {
		super(name || 'number', [ Number ]);
	}

	normalize(value, subschema) {
		if (!_.isNumber(value)) {
			if (_.isString(value)) {
				if (!value || isNaN(value)) {
					throw new FieldError('invalid_type', 'Must be a number');
				}
				value = parseFloat(value);
			} else if (_.isDate(value)) {
				value = value.getTime();
			} else {
				throw new FieldError('invalid_type', 'Must be a number');
			}
		}
		if (_.isNumber(subschema.max) && value > subschema.max) {
			throw new FieldError('too_large', subschema.maxError || 'Too large');
		}
		if (_.isNumber(subschema.min) && value < subschema.min) {
			throw new FieldError('too_small', subschema.minError || 'Too small');
		}
		return value;
	}

	validate(value, ...args) {
		if (!_.isNumber(value)) {
			throw new FieldError('invalid_type', 'Must be a number');
		}
		super.validate(value, ...args);
	}

	checkTypeMatch(value) {
		if (_.isNumber(value)) {
			return 3;
		} else if (_.isString(value) && value && !isNaN(value)) {
			return 2;
		} else {
			return 0;
		}
	}

}
exports.SchemaTypeNumber = SchemaTypeNumber;

class SchemaTypeDate extends SchemaTypePrimitive {

	constructor(name) {
		super(name || 'date', [ Date ]);
	}

	normalizeSchema(subschema, schema) {
		subschema = super.normalizeSchema(subschema, schema);
		if (subschema.default === Date.now) {
			subschema.default = () => new Date();
		}
		if (subschema.min) {
			subschema.min = this._toDate(subschema.min);
			if (subschema.min === null) {
				throw new SchemaError('Date min must be valid date');
			}
		}
		if (subschema.max) {
			subschema.max = this._toDate(subschema.max);
			if (subschema.max === null) {
				throw new SchemaError('Date max must be valid date');
			}
		}
		return subschema;
	}

	_toDate(value) {
		if (!_.isDate(value)) {
			if (_.isString(value)) {
				value = new Date(value);
			} else if (_.isNumber(value)) {
				value = new Date(value);
			} else {
				return null;
			}
		}
		if (isNaN(value.getTime())) {
			return null;
		}
		return value;
	}

	normalize(value, subschema, field, options) {
		value = this._toDate(value);
		if (value === null) {
			throw new FieldError('invalid_type', 'Must be a date');
		}
		if (subschema.max && value.getTime() > subschema.max.getTime()) {
			throw new FieldError('too_large', subschema.maxError || 'Too large');
		}
		if (subschema.min && value.getTime() < subschema.min.getTime()) {
			throw new FieldError('too_small', subschema.minError || 'Too small');
		}
		if (options.serialize) {
			value = value.toISOString();
		}
		return value;
	}

	validate(value, ...args) {
		if (!_.isDate(value)) {
			throw new FieldError('invalid_type', 'Must be a date');
		}
		super.validate(value, ...args);
	}

	checkTypeMatch(value) {
		if (_.isDate(value)) {
			return 3;
		} else if (this._toDate(value)) {
			return 2;
		} else {
			return 0;
		}
	}

}
exports.SchemaTypeDate = SchemaTypeDate;

class SchemaTypeBinary extends SchemaTypePrimitive {

	constructor(name) {
		super(name || 'binary', [ Buffer ]);
	}

	normalize(value, subschema, field, options) {
		if (!(value instanceof Buffer)) {
			if (_.isString(value)) {
				if (/[^a-z0-9+\/=]/i.test(value)) {
					throw new FieldError('invalid_type', 'Must be base64 data');
				}
				value = new Buffer(value, 'base64');
			} else if (Array.isArray(value) && _.every(value, _.isNumber)) {
				value = new Buffer(value);
			} else {
				throw new FieldError('invalid_type', 'Must be binary data');
			}
		}
		if (_.isNumber(subschema.maxLength) && value.length > subschema.maxLength) {
			throw new FieldError('too_long', subschema.maxLengthError || 'Data is too long');
		}
		if (_.isNumber(subschema.minLength) && value.length < subschema.minLength) {
			throw new FieldError('too_short', subschema.minLengthError || 'Data is too short');
		}
		if (options.serialize) {
			value = value.toString('base64');
		}
		return value;
	}

	validate(value, ...args) {
		if (!(value instanceof Buffer)) {
			throw new FieldError('invalid_type', 'Must be a buffer');
		}
		super.validate(value, ...args);
	}

	checkTypeMatch(value) {
		if (value instanceof Buffer) {
			return 3;
		} else if (Array.isArray(value) && _.every(value, _.isNumber)) {
			return 2;
		} else if (_.isString(value) && !/[^a-z0-9+\/=]/i.test(value)) {
			return 2;
		} else {
			return 0;
		}
	}

}
exports.SchemaTypeBinary = SchemaTypeBinary;

class SchemaTypeBoolean extends SchemaTypePrimitive {

	constructor(name) {
		super(name || 'boolean', [ Boolean ]);
		this.trueStringSet = {
			'true': 1,
			't': 1,
			'y': 1,
			'yes': 1,
			'1': 1,
			'on': 1,
			'totallydude': 1
		};
		this.falseStringSet = {
			'false': 1,
			'f': 1,
			'n': 1,
			'no': 1,
			'0': 1,
			'off': 1,
			'definitelynot': 1
		};
	}

	normalize(value, subschema) {
		if (_.isBoolean(value)) {
			return value;
		} else if (value === 0 || value === 1) {
			return value === 1;
		} else if (_.isString(value)) {
			value = value.toLowerCase();
			if (this.trueStringSet[value]) {
				return true;
			}
			if (this.falseStringSet[value]) {
				return false;
			}
		}
		throw new FieldError('invalid_type', 'Must be boolean');
	}

	validate(value, ...args) {
		if (!_.isBoolean(value)) {
			throw new FieldError('invalid_type', 'Must be a boolean');
		}
		super.validate(value, ...args);
	}

	checkTypeMatch(value) {
		if (_.isBoolean(value)) {
			return 3;
		} else if (value === 0 || value === 1) {
			return 2;
		} else {
			value = value.toLowerCase();
			if (this.falseStringSet[value] || this.trueStringSet[value]) {
				return 2;
			} else {
				return 0;
			}
		}
	}

}
exports.SchemaTypeBoolean = SchemaTypeBoolean;

class SchemaTypeMixed extends SchemaTypePrimitive {

	constructor(name) {
		super(name || 'mixed', [ Mixed ]);
	}

	getFieldSubschema(subschema, pathComponent, schema) {
		return {
			type: 'mixed'
		};
	}

	normalize(value) {
		return value;
	}

	checkTypeMatch(value) {
		return 0;
	}

}
exports.SchemaTypeMixed = SchemaTypeMixed;
