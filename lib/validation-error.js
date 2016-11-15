// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

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
 *   field error is used.
 */
class ValidationError extends XError {

	constructor(fieldErrors, message) {
		if (typeof fieldErrors === 'string') {
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
		Object.defineProperty(this, '_isValidationError', { value: true });
	}

}

/**
 * Returns whether or not the parameter is a validation error.
 *
 * @method isValidationError
 * @static
 * @returns {Boolean}
 */
ValidationError.isValidationError = function(value) {
	return !!(value && value._isValidationError);
};

module.exports = ValidationError;
