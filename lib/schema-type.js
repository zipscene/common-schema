
/**
 * Superclass for schema type definitions.
 *
 * @class SchemaType
 * @constructor
 * @param {String} name - Name of schema type.
 */
class SchemaType {

	constructor(name) {
		this._typeName = name;
	}

	/**
	 * Returns the name of this type.
	 *
	 * @method getName
	 * @return {String}
	 */
	getName() {
		return this._typeName;
	}

	/**
	 * Determines whether this subschema handles a shorthand type, ex. `Number` .
	 *
	 * @method matchShorthandType
	 * @param {Mixed} subschema - The shorthand type value
	 * @return {Boolean} - True if this type can normalize the shorthand type into a full,
	 * proper subschema.
	 */
	matchShorthandType(subschema) {

	}

	/**
	 * Normalizes this subschema and, recursively, any of its subschemas.
	 *
	 * @method normalizeSchema
	 * @throws {SchemaError} - On invalid subschema
	 * @param {Mixed} subschema - The unnormalized subschema, possibly a shorthand type such as `Number`
	 * @param {Schema} schema - The parent Schema object
	 * @return {Object} - The normalized subschema.  Must have a `type` property.
	 */
	normalizeSchema(subschema, schema) {

	}

	/**
	 * Traverses an object or value according to a schema.  This is responsible for calling handlers
	 * on any subschemas or subcomponents.  It is not responsible for calling the onField handler
	 * for itself.
	 *
	 * @method traverseObject
	 * @param {Mixed} value - Value of the field corresponding to this subschema.
	 * @param {Object} subschema - Subschema corresponding to this field.
	 * @param {String} field - Dot-separated path to the field.  The root field is represented by empty string ('').
	 * @param {Object} handlers
	 * @param {Schema} schema - Root schema object.
	 */
	traverseObject(value, subschema, field, handlers, schema) {

	}

	/**
	 * Transforms a subfield of an object.  This method is responsible for calling the handlers on each
	 * subfield and setting the resulting fields.  This method is NOT responsible for calling the
	 * handlers on its own field.
	 *
	 * @method transformObject
	 * @param {Mixed} value
	 * @param {Object} subschema
	 * @param {String} field
	 * @param {Object} handlers
	 * @param {Promise[]} promises - If a handler returns a promise, this function is responsible
	 * for waiting for the promise and setting field value when the promise returns.  Additionally,
	 * the promise should be added to the promises array passed in.
	 * @param {Schema} schema
	 */
	transformObject(value, subschema, field, handlers, promises, schema) {
	
	}

	/**
	 * Validates an object according to the schema.
	 *
	 * @method validate
	 * @param {Mixed} value
	 * @param {Object} subschema
	 * @param {String} field
	 * @param {FieldError[]} fieldErrors - Instead of throwing an exception on a validation
	 * failure, add the FieldError to this array.
	 * @param {Object} options
	 * @param {Schema} schema
	 */
	validate(value, subschema, field, fieldErrors, options, schema) {

	}

	/**
	 * Normalizes the schema value.  Returns the normalized value.  Should also perform full
	 * validation of the value, and if valid, recurse into subvalues.
	 *
	 * @method normalize
	 * @param {Mixed} value
	 * @param {Object} subschema
	 * @param {String} field
	 * @param {FieldError[]} fieldErrors
	 * @param {Object} options
	 * @param {Schema} schema
	 * @return {Mixed} - The normalized value
	 */
	normalize(value, subschema, field, fieldErrors, options, schema) {

	}

}

