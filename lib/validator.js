let _ = require('lodash');
let FieldError = require('./field-error');

/**
 * Class containing handlers to validate an object according to a schema.  Instantiated in
 * Schema#validate.
 *
 * @class Validator
 * @constructor
 * @param {Schema} schema
 * @param {Object} options
 */
class Validator {

	constructor(schema, options) {
		this.schema = schema;
		this.options = options;
		this.fieldErrors = [];
	}

	addFieldError(fieldError) {
		this.fieldErrors.push(fieldError);
	}

	getFieldErrors() {
		return this.fieldErrors;
	}

	onField(field, value, subschema, subschemaType) {
		if (
			(value === undefined || value === null) &&
			subschema.default !== undefined && subschema.default !== null
		) {
			value = (typeof subschema.default === 'function') ? subschema.default() : subschema.default;
		}
		if (value === undefined || value === null) {
			if (subschema.required && !this.options.allowMissingFields) {
				this.addFieldError(new FieldError(
					'required',
					subschema.requiredError || 'Field is required',
					field
				));
			}
		} else {
			if (Array.isArray(subschema.enum) && !subschemaType.checkEnum(value, subschema.enum)) {
				this.addFieldError(new FieldError(
					'unrecognized',
					subschema.enumError || 'Unrecognized value',
					{ value, enum: subschema.enum },
					field
				));
			} else {
				try {
					subschemaType.validate(value, subschema, field, this.options, this.schema);
					if (typeof subschema.validate === 'function') {
						subschema.validate(value, subschema, field, this.options, this.schema);
					}
				} catch (ex) {
					if (FieldError.isFieldError(ex)) {
						ex.field = field;
						this.addFieldError(ex);
						return false;
					} else {
						throw ex;
					}
				}
			}
		}
	}

	onUnknownField(field, value) {
		if (!this.options.allowUnknownFields && !this.options.removeUnknownFields) {
			this.addFieldError(new FieldError('unknown_field', 'Unknown field', field));
		}
	}

}

module.exports = Validator;
