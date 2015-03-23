let Schema = require('./schema');

/**
 * Class that creates schemas.  Custom schema types can be registered to a factory and schemas
 * created from that factory will be able to use those types.
 *
 * @class SchemaFactory
 * @constructor
 */
class SchemaFactory {

	constructor() {
		this._schemaTypes = {};
		let coreSchemaTypes = require('./core-schema-types');
		for (let key in coreSchemaTypes) {
			let Constructor = coreSchemaTypes[key];
			let instance = new Constructor();
			this.registerType(instance.getName(), instance);
		}
	}

	/**
	 * Registers a new schema type.
	 *
	 * @method registerType
	 * @param {String} name - String name of type
	 * @param {SchemaType} schemaType - Instance of a SchemaType
	 */
	registerType(name, schemaType) {
		this._schemaTypes[name] = schemaType;
	}

	/**
	 * Creates a Schema from this factory.
	 *
	 * @method createSchema
	 * @throws {SchemaError} - On invalid schema
	 * @param {Mixed} schemaData - Data for this schema.
	 * @return {Schema} - The created schema.
	 */
	createSchema(schemaData) {
		return new Schema(schemaData, this);
	}

}

module.exports = SchemaFactory;
