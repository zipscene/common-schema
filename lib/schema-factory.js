// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const Schema = require('./schema');

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
		this._loadTypes(require('./core-schema-types'));
		this._loadTypes(require('./geo-schema-types'));
	}

	/**
	 * Instantiates and loads all the given schema types.
	 *
	 * @method _loadTypes
	 * @private
	 * @param {Object} typeMap - A mapping from arbitrary keys to SchemaType constructors
	 */
	_loadTypes(typeMap) {
		for (let key in typeMap) {
			let Constructor = typeMap[key];
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
	 * @param {Object} [options] - Schema options.
	 * @return {Schema} - The created schema.
	 */
	createSchema(schemaData, options) {
		return new Schema(schemaData, this, options);
	}

}

module.exports = SchemaFactory;
