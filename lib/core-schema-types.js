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
	}

	transformAsync(value, subschema, field, handlers, schema) {
		return Promise.all(_.map(_.keys(subschema.properties), function(prop) {
			return schema._transformSubschemaValueAsync(
				value[prop],
				subschema.properties[prop],
				field ? (field + '.' + prop) : prop,
				handlers
			).then(function(newValue) {
				if(newValue === undefined) {
					delete value[prop];
				} else {
					value[prop] = newValue;
				}
			});
		}));
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

}

class SchemaTypeString extends SchemaType {

	constructor(name) {
		super(name || 'string');
	}

	matchShorthandType(subschema) {
		return (_.isPlainObject(subschema) && !subschema.type);
	}



}
exports.SchemaTypeString = SchemaTypeString;



