let SchemaError = require('./schema-error');
let _ = require('lodash');

/**
 * This class wraps a schema definition and provides methods to utilize it.
 *
 * Schemas are normalized on construction to an internal format.  Either this internal format
 * or a shorthand format, or a combination, can be supplied to the constructor.  For details,
 * see the readme.
 *
 * This class should not be instantiated directly.  Instead, use SchemaFactory.createSchema().
 *
 * @class Schema
 * @constructor
 * @throws {SchemaError} - On invalid schema
 * @param {Object} schemaData - The raw schema data in full or shorthand form
 * @param {SchemaFactory} schemaFactory - The schema factory constructing this schema.
 */
class Schema {

	constructor(schemaData, schemaFactory) {
		this._schemaData = schemaData;
		this._schemaFactory = schemaFactory;
		this.normalizeSchema();
	}

	/**
	 * Normalizes and validates the encapsulated schema data.  This occurs automatically on
	 * construction but may be called additional times if the schema data is manually modified.
	 *
	 * @method normalizeSchema
	 * @throws {SchemaError} - On invalid schema
	 */
	normalizeSchema() {
		this._schemaData = this._normalizeSubschema(this._schemaData);
	}

	_normalizeSubschema(subschema) {
		if (_.isPlainObject(subschema) && _.isString(subschema.type)) {
			let schemaType = this._getType(subschema.type);
			schemaType.normalizeSchema(subschema, this);
			return subschema;
		} else {
			// Shorthand schema
			let schemaType;
			for (let schemaTypeName in this._schemaFactory._schemaTypes) {
				if (this._schemaFactory._schemaTypes[schemaTypeName].matchShorthandType(subschema)) {
					schemaType = this._schemaFactory._schemaTypes[schemaTypeName];
				}
			}
			if (!schemaType) throw new SchemaError('Unknown schema type: ' + subschema);
			subschema = schemaType.normalizeSchema(subschema, this);
			return subschema;
		}
	}

	/**
	 * Returns the current raw schema data object.
	 *
	 * @method getData
	 * @return {Mixed} - Raw schema data
	 */
	getData() {
		return this._schemeData;
	}

	/**
	 * Traverses a schema along with an object, calling onField for each field defined by the schema.
	 * onField is called for each field along the path, including parent fields.  Ie, if the schema
	 * contains an object, onField is called first for the object itself, then for each field inside
	 * the object.
	 *
	 * onField is called for each field defined by the schema, even fields not defined in the object.
	 * In this case, the value is set to undefined.  The exception to this is when traversing arrays.
	 * onField is first called for the array object itself, then for each element in the array,
	 * recursively.  If the array has zero elements, it will not be recursed into.
	 *
	 * The onUnknownField handler will be called for each field that exists in the object but is not
	 * recognized by the schema.  Such fields will not be recursively traversed.
	 *
	 * @method traverseObject
	 * @throws {SchemaError} - On invalid schema
	 * @param {Object} obj - The object to traverse alongside the schema.
	 * @param {Object} handlers - Handler functions to call while traversing.
	 * @param {Function} handlers.onField - Function called for each field in the schema.
	 * @param {String} handlers.onField.field - String dot-separated path to the field.
	 * @param {Mixed} handlers.onField.value - Value of the field on the object.
	 * @param {Object} handlers.onField.schema - Normalized schema component corresponding to the
	 * field.
	 * @param {Function} handlers.onUnknownField - Function called when a field is defined on
	 * the object that is not defined in the schema.
	 * @param {String} handlers.onUnknownField.field - Path to field.
	 * @param {Mixed} handlers.onUnknownField.value - Value of the field.
	 */
	traverseObject(obj, handlers) {
		this._traverseSubschemaObject(obj, this._schemaData, '', handlers);
	}

	_traverseSubschemaObject(value, subschema, field, handlers) {
		if (subschema) {
			handlers.onField(field, value, subschema);
			this._getType(subschema.type).traverseObject(value, subschema, field, handlers, this);
		} else {
			handlers.onUnknownField(field, value);
		}
	}

	/**
	 * Like traverseObject(), but each handler can return a replacement value for its respective
	 * field.  Returning a value of undefined will cause the field to be deleted.
	 *
	 * Handlers may return a Promise.  transformObject() returns a Promise that is resolved
	 * when all handler promises are resolved.  If none of the handlers return a promise,
	 * the promise returned from transformObject() is immediately resolved.
	 *
	 * If a handler throws, the exception is not caught; it is immediately thrown from this
	 * function.
	 *
	 * @method transformObject
	 * @throws {SchemaError}
	 * @param {Object} obj
	 * @param {Object} handlers
	 * @return {Promise} - Promise that is resolved when all fields are transformed
	 */
	transformObject(obj, handlers) {
		let promises = [];
		obj = this._transformSubschemaObject(obj, this._schemaData, '', handlers, promises);
		if (promises.length === 0) {
			return Promise.resolve(obj);
		} else if (promises.length === 1) {
			return promises[0].then(function() {
				return obj;
			});
		} else {
			return Promise.all(promises).then(function() {
				return obj;
			});
		}
	}

	_transformSubschemaObject(value, subschema, field, handlers, promises) {
		
	}

	/**
	 * Validates a value against the schema.  Values are strictly validated as if already normalized.
	 * Ie, even though a numeric string may be able to be normalized to a Number type, it fails
	 * validation.  If this is not desired behavior, use normalize() instead.
	 *
	 * @method validate
	 * @throws {ValidationError} - On invalid value
	 * @throws {SchemaError} - On invalid schema
	 * @param {Mixed} value - Value/object to validate
	 * @param {Object} [options]
	 * @param {Boolean} options.allowUnknownFields - By default, an error is thrown if fields are
	 * defined on an object that aren't defined on the schema.  If this is set to true, that error
	 * is suppressed.
	 * @param {Boolean} options.allowMissingFields - By default, an error is thrown if a required
	 * field is missing.  If this is true, required field errors are suppressed.
	 */
	validate(value, options = {}) {

	}

	_subschemaValidate(value, subschema, field, fieldErrors, options) {

	}

	/**
	 * Normalizes a value according to the schema.  If the value is an object, normalization
	 * is performed in-place.  Full validation is performed as part of the normalization.
	 *
	 * @method normalize
	 * @throws {ValidationError} - On invalid value
	 * @throws {SchemaError} - On invalid schema
	 * @param {Mixed} value - Value to normalize
	 * @param {Object} [options]
	 * @param {Boolean} options.allowUnknownFields - By default, an error is thrown if fields are
	 * defined on an object that aren't defined on the schema.  If this is set to true, that error
	 * is suppressed.
	 * @param {Boolean} options.allowMissingFields - By default, an error is thrown if a required
	 * field is missing.  If this is true, required field errors are suppressed.
	 * @param {Boolean} options.serialize - Default normalization normalizes to internal javascript
	 * types (such as a Date object) that may not easily stringify.  If this option is set, types
	 * are normalized into easily serializable values (ie, JSON types).
	 * @return {Mixed} - The normalized value; if an object, the same as the value parameter
	 */
	normalize(value, options = {}) {

	}

	_subschemaNormalize(value, subschema, field, fieldErrors, options) {

	}

	/**
	 * Alias for normalize() with the `serialize` option set.
	 *
	 * @method serialize
	 * @throws {ValidationError} - On invalid value
	 * @throws {SchemaError} - On invalid schema
	 * @param {Mixed} value
	 * @param {Object} [options]
	 * @return {Mixed}
	 */
	serialize(value, options = {}) {
		options.serialize = true;
		return this.normalize(value, options);
	}

	/**
	 * Creates a function that validates objects passed in.
	 *
	 * @method createValidateFn
	 * @throws {SchemaError} - On invalid schema
	 * @param {Object} [options] - Options to validate()
	 * @return {Function} - function(value) that validates the value
	 */
	createValidateFn(options = {}) {
		return ( (value) => this.validate(value, options) );
	}

	/**
	 * Creates a function that normalizes objects passed in.
	 *
	 * @method createNormalizeFn
	 * @throws {SchemaError} - On invalid schema
	 * @param {Object} [options] - Options to normalize()
	 * @return {Function} - function(value) that normalizes the value
	 */
	createNormalizeFn(options) {
		return ( (value) => this.normalize(value, includeUnknownFields) );
	}

	/**
	 * Returns a SchemaType by name.
	 *
	 * @method _getType
	 * @protected
	 * @throws {SchemaError} - On type not found
	 * @param {String} name
	 * @return {SchemaType}
	 */
	_getType(name) {
		let schemaType = this._schemaFactory._schemaTypes[name];
		if (!schemaType) {
			throw new SchemaError('Unknown schema type: ' + name);
		}
		return schemaType;
	}

}
