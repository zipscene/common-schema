let XError = require('xerror');
let _ = require('lodash');

XError.registerErrorCode('validation_error', {
	message: 'Validation error',
	http: 400
});

/**
 * Class representing object validation error.
 *
 * @class ValidationError
 * @extends XError
 * @constructor
 * @param {FieldError[]} [fieldErrors] - Array of errors for individual fields
 * @param {String} [message] - Message to use for the error.  By default, the message of the first
 * field error is used.
 */
class ValidationError extends XError {

	constructor(fieldErrors, message) {
		if (_.isString(fieldErrors)) {
			message = fieldErrors;
			fieldErrors = undefined;
		}
		if (!message) {
			if (fieldErrors && fieldErrors.length) {
				message = fieldErrors[0].message || 'Validation failure';
			} else {
				message = 'Validation failure';
			}
		}
		if (fieldErrors && fieldErrors.length) {
			super(XError.VALIDATION_ERROR, message, { fieldErrors: fieldErrors });
		} else {
			super(XError.VALIDATION_ERROR, message);
		}
	}

}

module.exports = ValidationError;
