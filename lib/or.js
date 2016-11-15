// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

let objtools = require('objtools');

/**
 * Generates a subschema that's an OR between two or more other schemas (ie, any of the
 * listed components can match).  Use it like this:
 *
 * ```js
 * createSchema({
 *   foo: or({ required: true }, String, Number)
 * })
 * ```
 *
 * @method or
 * @param {Object} schema - Schema params or empty object.  This can be left out if the first
 *   arg isn't an object.
 * @param {Mixed} args... - Subschemas that are alternatives.
 * @return {Object} The `or` type subschema.
 */
function or(schema, ...args) {
	if (!objtools.isPlainObject(schema)) {
		args.unshift(schema);
		schema = {};
	}
	schema.type = 'or';
	schema.alternatives = args;
	return schema;
}

module.exports = or;
