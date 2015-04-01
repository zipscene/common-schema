let _ = require('lodash');

function or(...args) {
	let schema = {};
	if (args.length && _.isPlainObject(args[args.length - 1]) && !args[args.length - 1].type) {
		schema = args.pop();
	}
	schema.type = 'or';
	schema.alternatives = args;
	return schema;
}

module.exports = or;
