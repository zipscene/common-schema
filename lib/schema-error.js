// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

let XError = require('xerror');

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
