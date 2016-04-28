let objtools = require('zs-objtools');

/**
 * Generates a subschema that's a map type.
 *
 * ```js
 * createSchema({
 *   // Required map from string (all keys are strings) to number
 *   foo: map({ required: true }, Number)
 * })
 * ```
 *
 * @method map
 * @param {Object} schema - Schema params or empty object.  This can be left out if the first
 *   arg isn't an object.
 * @param {Mixed} valueSchema - Schema for values
 * @return {Object} The `map` type subschema.
 */
function map(schema, valueSchema) {
	if (!objtools.isPlainObject(schema)) {
		valueSchema = schema;
		schema = {};
	}
	schema.type = 'map';
	schema.values = valueSchema;
	return schema;
}

module.exports = map;
