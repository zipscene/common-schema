let SchemaType = require('./schema-type');
let SchemaError = require('./schema-error');
let FieldError = require('./field-error');
let ValidationError = require('./validation-error');
let Mixed = require('./mixed');
let _ = require('lodash');
let objtools = require('zs-objtools');
let SchemaTypeNumber = require('./core-schema-types').SchemaTypeNumber;

class SchemaTypeGeoPoint extends SchemaType {

	constructor(name) {
		super(name || 'geopoint');
		this._numberType = new SchemaTypeNumber();
	}

	validate(value) {
		if (
			!_.isArray(value) ||
			value.length !== 2 ||
			!_.isNumber(value[0]) ||
			!_.isNumber(value[1])
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

	normalize(value) {
		if (_.isString(value)) {
			value = value.split(',');
		}
		if (_.isArray(value)) {
			if (value.length !== 2) {
				throw new FieldError('invalid_type', 'Must be array in form [ long, lat ]');
			}
			value[0] = this._numberType.normalize(value[0], { type: 'number', min: -180, max: 180 });
			value[1] = this._numberType.normalize(value[1], { type: 'number', min: -90, max: 90 });
		}
		this.validate(value);
		return value;
	}

	checkTypeMatch(value) {
		try {
			this.normalize(value);
		} catch (ex) {
			return 0;
		}
		return 1;
	}

}
exports.SchemaTypeGeoPoint = SchemaTypeGeoPoint;

