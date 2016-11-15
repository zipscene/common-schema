// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

let _ = require('lodash');
let FieldError = require('./field-error');

/**
 * Class containing handlers to normalize an object according to a schema.  Instantiated in
 * Schema#normalize.
 *
 * @class Normalizer
 * @constructor
 * @param {Schema} schema
 * @param {Object} options
 */
class Normalizer {

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
			try {
				if (typeof subschema.normalize === 'function') {
					value = subschema.normalize(value, subschema, field, this.options, this.schema);
				}
				value = subschemaType.normalize(value, subschema, field, this.options, this.schema);
				if (typeof subschema.validate === 'function') {
					subschema.validate(value, subschema, field, this.options, this.schema);
				}
			} catch (ex) {
				if (FieldError.isFieldError(ex)) {
					ex.field = field;
					this.addFieldError(ex);
					return value;
				} else {
					throw ex;
				}
			}
			if (Array.isArray(subschema.enum) && !subschemaType.checkEnum(value, subschema.enum)) {
				this.addFieldError(new FieldError(
					'unrecognized',
					subschema.enumError || 'Unrecognized value',
					{ value, enum: subschema.enum },
					field
				));
			}
		}
		return value;
	}

	onUnknownField(field, value) {
		if (this.options.removeUnknownFields) {
			return undefined;
		} else if (!this.options.allowUnknownFields) {
			this.addFieldError(new FieldError('unknown_field', 'Unknown field', field));
		}
		return value;
	}

}

module.exports = Normalizer;
