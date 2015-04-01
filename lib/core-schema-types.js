let SchemaType = require('./schema-type');
let SchemaError = require('./schema-error');
let FieldError = require('./field-error');
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
	}

	normalize(value, subschema, field, options, schema) {
		this.validate(value, subschema, field, options, schema);
		return value;
	}

}
exports.SchemaTypeArray = SchemaTypeArray;

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

}
exports.SchemaTypeString = SchemaTypeString;



