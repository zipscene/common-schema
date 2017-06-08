// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

let SchemaType = require('./schema-type');
let SchemaError = require('./schema-error');
let FieldError = require('./field-error');
let ValidationError = require('./validation-error');
let Mixed = require('./mixed');
let _ = require('lodash');
let objtools = require('objtools');
let SchemaTypeNumber = require('./core-schema-types').SchemaTypeNumber;
let SchemaTypeString = require('./core-schema-types').SchemaTypeString;

const GeojsonJsonSchema = require('./geojson-json-schema');

// Instantiate a few types that we can use for internal validation
const numberType = new SchemaTypeNumber();


// Validates a [ long, lat ] value
function validatePosition(value) {
	if (
		!_.isArray(value) ||
		value.length !== 2 ||
		typeof value[0] !== 'number' ||
		typeof value[1] !== 'number'
	) {
		throw new FieldError('invalid_type', 'Must be array in form [ long, lat ]');
	}
	if (value[0] < -180 || value[0] > 180) {
		throw new FieldError('invalid_format', 'Longitude must be between -180 and 180');
	}
	if (value[1] < -90 || value[1] > 90) {
		throw new FieldError('invalid_format', 'Latitude must be between -90 and 90');
	}
}

// Normalizes a [ long, lat ] value
function normalizePosition(value) {
	if (typeof value === 'string') {
		value = value.split(',');
	}
	if (_.isArray(value)) {
		if (value.length !== 2) {
			throw new FieldError('invalid_type', 'Must be array in form [ long, lat ]');
		}
		value[0] = numberType.normalize(value[0], { type: 'number', min: -180, max: 180 });
		value[1] = numberType.normalize(value[1], { type: 'number', min: -90, max: 90 });
	}
	validatePosition(value);
	return value;
}

class SchemaTypeGeoPoint extends SchemaType {

	constructor(name) {
		super(name || 'geopoint');
		this._numberType = new SchemaTypeNumber();
	}

	validate(value) {
		validatePosition(value);
	}

	normalize(value) {
		return normalizePosition(value);
	}

	toJSONSchema(subschema) {
		return {
			type: 'array',
			items: {
				type: 'number'
			},
			minItems: 2,
			maxItems: 2,
			description: subschema.description || 'Longitude, Latitude'
		};
	}

}

exports.SchemaTypeGeoPoint = SchemaTypeGeoPoint;


class SchemaTypeGeoJSON extends SchemaType {

	constructor(name) {
		super(name || 'geojson');
		// Store schema objects that correspond to the different geojson types
		// It has to be done this way because of circular reference issues ...
		// This is a mapping from string type names to schemas for the type
		this._geoTypeSchemaDatas = {
			Point: { type: 'object', properties: { type: String, coordinates: 'geopoint' } },
			LineString: { type: 'object', properties: { type: String, coordinates: [ 'geopoint' ] } },
			Polygon: { type: 'object', properties: { type: String, coordinates: [ [ 'geopoint' ] ] } },
			MultiPoint: { type: 'object', properties: { type: String, coordinates: [ 'geopoint' ] } },
			MultiLineString: { type: 'object', properties: { type: String, coordinates: [ [ 'geopoint' ] ] } },
			MultiPolygon: { type: 'object', properties: { type: String, coordinates: [ [ [ 'geopoint' ] ] ] } },
			GeometryCollection: { type: 'object', properties: { type: String, geometries: [ 'geojson' ] } }
		};
		// Initially empty cache of instantiated schemas
		this._geoTypeSchemas = {};
	}

	_getGeoTypeSchema(type) {
		if (this._geoTypeSchemas[type]) {
			return this._geoTypeSchemas[type];
		}
		if (this._geoTypeSchemaDatas[type]) {
			// Sadly, this needs to be here to prevent circular reference issues
			const createSchema = require('./index').createSchema;
			this._geoTypeSchemas[type] = createSchema(this._geoTypeSchemaDatas[type]);
			return this._geoTypeSchemas[type];
		}
		throw new FieldError('invalid_type', 'Unrecognized GeoJSON type: ' + type);
	}

	validate(value, subschema) {
		if (!objtools.isPlainObject(value)) {
			throw new FieldError('invalid_type', 'GeoJSON object must be object');
		}
		if (typeof value.type !== 'string') {
			throw new FieldError('invalid_type', 'GeoJSON object must have a "type" property');
		}
		if (_.isArray(subschema.allowedTypes) && !_.includes(subschema.allowedTypes, value.type)) {
			throw new FieldError(
				'invalid_type',
				'GeoJSON object must have type ' + subschema.allowedTypes.join(', ')
			);
		}
		try {
			this._getGeoTypeSchema(value.type).validate(value);
		} catch (ex) {
			throw new FieldError('invalid_format', ex.message);
		}
	}

	normalize(value, subschema) {
		if (!objtools.isPlainObject(value)) {
			throw new FieldError('invalid_type', 'GeoJSON object must be object');
		}
		if (typeof value.type !== 'string') {
			throw new FieldError('invalid_type', 'GeoJSON object must have a "type" property');
		}
		if (_.isArray(subschema.allowedTypes) && !_.includes(subschema.allowedTypes, value.type)) {
			throw new FieldError(
				'invalid_type',
				'GeoJSON object must have type ' + subschema.allowedTypes.join(', ')
			);
		}
		let result;
		try {
			result = this._getGeoTypeSchema(value.type).normalize(value);
		} catch (ex) {
			throw new FieldError('invalid_format', ex.message);
		}
		return result;
	}

	toJSONSchema(subschema, schema) {
		_.assignIn(schema.jsonSchemaDefinitions, GeojsonJsonSchema.definitions);

		let jsonSchema = GeojsonJsonSchema.schema;

		if (subschema.description) {
			jsonSchema = objtools.deepCopy(jsonSchema);
			jsonSchema.description = subschema.description;
		}

		return jsonSchema;
	}
}

exports.SchemaTypeGeoJSON = SchemaTypeGeoJSON;
