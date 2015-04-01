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

let SchemaFactory = require('./schema-factory');
let defaultSchemaFactory = new SchemaFactory();
exports.defaultSchemaFactory = defaultSchemaFactory;
function defaultCreateSchema(schemaData) {
	return defaultSchemaFactory.createSchema(schemaData);
}
exports.createSchema = defaultCreateSchema;
