let XError = require('xerror');
let _ = require('lodash');

XError.registerErrorCode('schema_error', {
	message: 'Schema error',
	http: 400
});

/**
 * Class representing errors in the syntax of a schema.
 *
 * @class SchemaError
 * @extends XError
 * @constructor
 * @param {String} message
 */
class SchemaError extends XError {

	constructor(message) {
		super(XError.SCHEMA_ERROR, message || 'Schema syntax error');
	}

}

module.exports = SchemaError;
