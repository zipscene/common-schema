let _ = require('lodash');

/**
 * Class that encapsulates schema error data for a single field.
 *
 * Standard field error codes:
 * - `invalid_type` - If the field is the wrong type
 * - `invalid_format` - If the format of a string field does not match a regex or validation routine
 * - `required` - If a required field is missing
 * - `duplicate` - If a field required to be unique has a duplicate value
 * - `invalid` - Generic error code
 * - `too_small` - Numeric value is too small
 * - `too_large` - Numeric value is too large
 * - `too_short` - String is too short
 * - `too_long` - String is too long
 * - `unrecognized` - Unrecognized value in an enum; details may optionally contain an `enum` array
 * - `unknown_field` - If a supplied field does not have an attached schema
 *
 * @class FieldError
 * @constructor
 * @param {String} code - lowercase_underscore_separated machine-readable code for the field
 * problem.  Validators can use their own codes if necessary, but prefer to use codes that
 * are listed above for consistency.
 * @param {String} message - Human-readable message.
 * @param {Mixed} [details] - Additional machine-readable details about the field error.
 * @param {String} field - Dot-separated field name of the problematic field.
 */
class FieldError {

	constructor(code, message, details, field) {
		if (_.isString(details)) {
			field = details;
			details = undefined;
		}
		this.field = field;
		this.code = code || 'invalid';
		this.message = message || 'Validation error';
		this.details = details;
		Object.defineProperty(this, '_isFieldError', { value: true });
	}

}

/**
 * Returns whether or not the parameter is a field error.
 *
 * @method isFieldError
 * @static
 */
FieldError.isFieldError = function(value) {
	return !!(value && value._isFieldError);
};

module.exports = FieldError;
