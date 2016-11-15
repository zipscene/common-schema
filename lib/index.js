// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

exports.Schema = require('./schema');
exports.SchemaFactory = require('./schema-factory');
exports.Normalizer = require('./normalizer');
exports.Validator = require('./validator');
exports.SchemaType = require('./schema-type');
exports.FieldError = require('./field-error');
exports.ValidationError = require('./validation-error');
exports.SchemaError = require('./schema-error');
exports.Mixed = require('./mixed');
exports.or = require('./or');
exports.map = require('./map');

let SchemaFactory = require('./schema-factory');
let defaultSchemaFactory = new SchemaFactory();
exports.defaultSchemaFactory = defaultSchemaFactory;
function defaultCreateSchema(schemaData) {
	return defaultSchemaFactory.createSchema(schemaData);
}
exports.createSchema = defaultCreateSchema;
