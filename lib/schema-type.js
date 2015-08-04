
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
	 *   proper subschema.
	 */
	matchShorthandType(subschema) {
		return false;
	}

	/**
	 * Traverses subschema components of this schema.  This is not responsible for calling
	 * handlers on itself; it only needs to recurse into subcomponents.
	 *
	 * @param {Object} subschema
	 * @param {String} path
	 * @param {Object} handlers
	 * @param {Schema} schema
	 * @param {Object} options
	 */
	traverseSchema(subschema, path, handlers, schema, options) {
	}

	/**
	 * Returns a single subschema of this schema based on a path component (ie, a field on the
	 * schema).
	 *
	 * @method getFieldSubschema
	 * @param {Object} subschema
	 * @param {String} pathComponent - Index into schema object
	 * @param {Schema} schema - Parent schema
	 * @return {Object|undefined} - Subschema, if it exists
	 */
	getFieldSubschema(subschema, pathComponent, schema) {
		return undefined;
	}

	/**
	 * Normalizes this subschema and, recursively, any of its subschemas.  Should also validate
	 * the schema.
	 *
	 * @method normalizeSchema
	 * @throws {SchemaError} - On invalid subschema
	 * @param {Mixed} subschema - The unnormalized subschema
	 * @param {Schema} schema - The parent Schema object
	 * @return {Object} - The normalized subschema.  Must have a `type` property.
	 */
	normalizeSchema(subschema, schema) {
		return subschema;
	}

	/**
	 * Called to normalize a shorthand schema into a full schema.  Does not need to recursively
	 * normalize subschemas - normalizeSchema() is called after this.
	 *
	 * @method normalizeShorthandSchema
	 * @throws {SchemaError}
	 * @param {Mixed} subschema - Shorthand schema.  Will always be an object containing a `type`.
	 * @param {Schema} schema
	 * @return {Object} - Normalized subschema
	 */
	normalizeShorthandSchema(subschema, schema) {
		return subschema;
	}

	/**
	 * Traverses an object or value according to a schema.  This is responsible for calling handlers
	 * on any subschemas or subcomponents.  It is not responsible for calling the onField handler
	 * for itself.
	 *
	 * @method traverse
	 * @param {Mixed} value - Value of the field corresponding to this subschema.
	 * @param {Object} subschema - Subschema corresponding to this field.
	 * @param {String} field - Dot-separated path to the field.  The root field is represented by empty string ('').
	 * @param {Object} handlers
	 * @param {Schema} schema - Root schema object.
	 */
	traverse(value, subschema, field, handlers, schema) {
	}

	/**
	 * Transforms subfields of an object.  This method is responsible for calling the handlers on each
	 * subfield and setting the resulting fields.  This method is NOT responsible for calling the
	 * handlers on its own field, or for setting its own field.
	 *
	 * @method transform
	 * @param {Mixed} value
	 * @param {Object} subschema
	 * @param {String} field
	 * @param {Object} handlers
	 * @param {Schema} schema
	 * @return {Mixed} New value for field (usually should be the same as value)
	 */
	transform(value, subschema, field, handlers, schema) {
		return value;
	}

	/**
	 * Asynchronous promise-based version of transform().
	 *
	 * @method transformAsync
	 * @param {Mixed} value
	 * @param {Object} subschema
	 * @param {String} field
	 * @param {Object} handlers
	 * @param {Schema} schema
	 * @return {Promise} - Resolve with new value for field
	 */
	transformAsync(value, subschema, field, handlers, schema) {
		return Promise.resolve(value);
	}

	/**
	 * Validates an object according to the schema.  This does not have to descend into subfields
	 * of an object.  The traverse() method is used for traversing subschemas.
	 *
	 * @method validate
	 * @throws {FieldError} - If the field is invalid
	 * @param {Mixed} value
	 * @param {Object} subschema
	 * @param {String} field
	 * @param {Object} options
	 * @param {Schema} schema
	 */
	validate(value, subschema, field, options, schema) {

	}

	/**
	 * Normalizes the schema value.  Returns the normalized value.  Should also perform full
	 * validation of the value.  This does not need to recurse.  It is executed inside of
	 * a transformObject() traversal.
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
	normalize(value, subschema, field, options, schema) {
		return value;
	}

	/**
	 * Checks whether or not the given value is contained in the set of valid values.
	 *
	 * @method checkEnum
	 * @param {Mixed} value
	 * @param {Mixed[]} validValues
	 * @return {Boolean} - true if value is in the set of validValues
	 */
	checkEnum(value, validValues) {
		return (validValues.indexOf(value) !== -1);
	}

	/**
	 * Checks whether the value roughly matches the type.  Returns a value that indicates
	 * approximately how well the value matches the type.
	 *
	 * The returned match value can be one of:
	 * - 3 - Value precisely matches the type.
	 * - 2 - Value does not exactly match the type, but can be coerced by `normalize()`.
	 * - 1 - Value matches the type, but the type is a complex type and requires further validation.
	 * - 0 - Value does not at all match the type.
	 *
	 * @method checkTypeMatch
	 * @param {Mixed} value - Value to match against.
	 * @return {Number} - See description above.
	 */
	checkTypeMatch(value, subschema, schema) {
		// Default (inefficient) implement is to try to validate, then
		// to normalize the type.
		/*eslint-disable*/
		try {
			this.validate(value);
			return 3;
		} catch (ex) { }
		try {
			this.normalize(value);
			return 2;
		} catch (ex) { }
		return 0;
	/*eslint-enable*/
	}

}

module.exports = SchemaType;
