let SchemaType = require('./schema-type');
let SchemaError = require('./schema-error');
let FieldError = require('./field-error');
let Mixed = require('./mixed');
let Schema = require('./schema');
let _ = require('lodash');

class SchemaTypeObject extends SchemaType {

	constructor(name) {
		super(name || 'object');
	}

	matchShorthandType(subschema) {
		return (_.isPlainObject(subschema) && !subschema.type);
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

	normalizeSchema(subschema, schema) {
		if (this.matchShorthandType(subschema)) {
			// Shorthand type
			subschema = {
				type: this.getName(),
				properties: subschema
			};
		}
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

	normalizeSchema(subschema, schema) {
		if (this.matchShorthandType(subschema)) {
			// Shorthand type
			subschema = {
				type: this.getName(),
				elements: subschema[0]
			};
		}
		if (!subschema.elements) {
			throw new SchemaError('Array schema must have elements field');
		}
		subschema.elements = schema._normalizeSubschema(subschema.elements);
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
		return Promise.all(_.map(value), function(elem, i) {
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
		}).then(function() {
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

	normalizeSchema(subschema, schema) {
		if (!Array.isArray(subschema.alternatives)) {
			throw new SchemaError('Or schema must have alternatives field');
		}
		for (let i = 0; i < subschema.alternatives.length; i++) {
			subschema.alternatives[i] = schema._normalizeSubschema(subschema.alternatives[i]);
		}
		return subschema;
	}

	_matchAlternative(value, subschema, schema) {
		// Check for ones that strictly validate
		for (let alt of subschema.alternatives) {
			if (schema._createSubschema(alt).validate())
		}
	}

}

class SchemaTypePrimitive extends SchemaType {

	constructor(name, shorthands) {
		super(name);
		this._shorthands = shorthands || [];
	}

	matchShorthandType(subschema) {
		return this._shorthands.indexOf(subschema) !== -1;
	}

	normalizeSchema(subschema) {
		if (this.matchShorthandType(subschema)) {
			return {
				type: this.getName()
			};
		} else {
			return subschema;
		}
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
			'totallydude': 1
		};
		this.falseStringSet = {
			'false': 1,
			'f': 1,
			'n': 1,
			'no': 1,
			'0': 1,
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

}
exports.SchemaTypeBoolean = SchemaTypeBoolean;

class SchemaTypeMixed extends SchemaTypePrimitive {

	constructor(name) {
		super(name || 'mixed', [ Mixed ]);
	}

	normalize(value) {
		return value;
	}

}
exports.SchemaTypeMixed = SchemaTypeMixed;
