var ZSError = require('zs-error');
var inherits = require('util').inherits;

function ValidationError(message, path) {
	var emsg;
	if(message && path) {
		emsg = 'Validation error at ' + path + ': ' + message;
	} else if(message) {
		emsg = 'Validation error: ' + message;
	} else if(path) {
		emsg = 'Validation error at ' + path;
	} else {
		emsg = 'Validation error';
	}

	ZSError.call(this, ZSError.INVALID_OBJECT, emsg, { errorMessage: message, path: path });
}
inherits(ValidationError, ZSError);

module.exports = ValidationError;
