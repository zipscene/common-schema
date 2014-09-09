var ValidationError = require('./validation-error');

var booleanMap = {
	'true': true,
	'yes': true,
	'1': true,
	'on': true,
	'false': false,
	'no': false,
	'0': false,
	'off': false
};

function parseJson(str, path) {
	try {
		return JSON.parse(str);
	} catch (ex) {
		throw new ValidationError('Invalid JSON object', path);
	}
}

var normalizers = {
	string: function(value, subschema, path) {
		value = ''+value;
		var rex = subschema.match || subschema.regex;
		if(rex && rex instanceof RegExp && !rex.test(value)) {
			throw new ValidationError('Invalid value', path);
		}
		if(Array.isArray(subschema.enum) && subschema.enum.indexOf(value) == -1) {
			throw new ValidationError('Invalid enum value', path);
		}
		return value;
	},
	number: function(value, subschema, path) {
		if(typeof value == 'string' && /^-?[0-9.]+$/.test(value)) {
			value = parseInt(value, 10);
		}
		if(typeof value != 'number') throw new ValidationError('Invalid number', path);
		if(isNaN(value)) throw new ValidationError('Invalid number', path);
		if(!subschema.allowInfinity && (value === Infinity || value === -Infinity)) throw new ValidationError('Infinity is not allowed', path);
		if(typeof subschema.min == 'number' && value < subschema.min) throw new ValidationError('Value must be at least ' + subschema.min, path);
		if(typeof subschema.max == 'number' && value > subschema.max) throw new ValidationError('Value must be at most ' + subschema.max, path);
		return value;
	},
	integer: function(value, subschema, path) {
		value = normalizers.number(value, subschema, path);
		if(typeof value == 'number') return Math.floor(value);
		return value;
	},
	date: function(value, subschema, path) {
		if(typeof value == 'string') {
			if(/^[0-9]+$/.test(value)) {
				value = parseInt(value, 10);
			} else {
				value = Date.parse(value);
			}
		}
		if(typeof value == 'number') {
			if(isNaN(value)) throw new ValidationError('Invalid date', path);
			value = new Date(value);
		}
		if(value instanceof Date) {
			if(value.toString() == 'Invalid Date') throw new ValidationError('Invalid date', path);
			return value;
		}
		throw new ValidationError('Invalid date type', path);
	},
	object: function(value, subschema, path) {
		if(typeof value == 'string') {
			value = parseJson(value, path);
		}
		if(!value) throw new ValidationError('Null object', path);
		if(typeof value != 'object' || Array.isArray(value)) throw new ValidationError('Value not an object', path);
		return value;
	},
	array: function(value, subschema, path) {
		if(value === null || value === undefined) throw new ValidationError('Null array', path);
		// Support native JS array
		if(Array.isArray(value)) return value;
		if(typeof value == 'string') {
			if(value[0] == '[') {
				// try to parse as JSON
				try {
					return JSON.parse(value);
				} catch (ex) {}
			}
			// If contains commas, treat as a comma-separated array
			if(value.indexOf(',') != -1) {
				return value.split(',');
			}
		}
		// Treat as an array with a single element
		return [value];
	},
	boolean: function(value, subschema, path) {
		if(typeof value == 'boolean') return value;
		value = booleanMap[(''+value).toLowerCase()];
		if(value !== undefined) return value;
		throw new ValidationError('Invalid boolean value', path);
	},
	mixedobject: function(value, subschema, path) {
		if(typeof value == 'string') {
			value = parseJson(value, path);
		}
		if(!value) throw new ValidationError('Null object', path);
		if(typeof value != 'object' || Array.isArray(value)) throw new ValidationError('Value not an object', path);
		return value;
	},
	binary: function(value, subschema, path) {
		// Check for already a buffer
		if(value instanceof Buffer) return value;
		// Check for an array of numeric byte values
		if(Array.isArray(value) && value.every(function(v) { return typeof v == 'number'; })) return new Buffer(value);
		// Check for base64 data
		if(typeof value == 'string' && /^[a-zA-Z0-9+=\/]*$/.test(value)) {
			return new Buffer(value, 'base64');
		}
		throw new ValidationError('Binary data must be base64 data or a Buffer', path);
	}
};


module.exports = normalizers;
