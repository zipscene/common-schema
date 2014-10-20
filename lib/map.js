/*
Map type for use in schemas.  Use like this:
{
	// Map from String keys to objects containing numbers
	foo: Map({
		values: {
			bar: Number
		}
	})
}
*/

var ZSError = require('zs-error');
var async = require('async');

function Map(valueSchema) {
	this.type = 'map';
	this.values = valueSchema;
}

module.exports = function(params) {
	if(!params) return { type: 'mixedobject' };	// with no key or value type, just use an abitrary type
	return new Map(params);
};

module.exports.registerType = function(Schema) {

	Schema.defaultTypeSchemaNormalizers.map = function(subschema, path, normalizeSubschema) {
		if(!subschema.values) throw new ZSError(ZSError.INVALID_OBJECT, 'Map schema requires values subschema');
		subschema.values = normalizeSubschema(subschema.values, path ? (path + '.values') : 'values');
	};

	Schema.documentTraversers.map = function(subdoc, subschema, path, traverseChild) {
		if(subdoc && typeof subdoc == 'object') {
			for(var key in subdoc) {
				if(subdoc[key] !== undefined) {
					traverseChild(subdoc[key], subschema.values, path ? (path + '.' + key) : key);
				}
			}
		}
	};

	Schema.documentTransformers.map = function(subdoc, subschema, path, transformChild) {
		if(subdoc && typeof subdoc == 'object') {
			var newObj = {};
			for(var key in subdoc) {
				if(subdoc[key] !== undefined) {
					var result = transformChild(subdoc[key], subschema.values, path ? (path + '.' + key) : key);
					if(result !== undefined) {
						newObj[key] = result;
					}
				}
			}
			return newObj;
		} else {
			return undefined;
		}
	};

	Schema.schemaTraversers.map = function(subschema, path, traverseChild) {
		traverseChild(subschema.values, path);
	};

	Schema.asyncDocumentTraversers.map = function(subdoc, subschema, path, traverseChild, done) {
		if(subdoc && typeof subdoc == 'object') {
			async.eachSeries(Object.keys(subdoc), function(key, next) {
				if(subdoc[key] !== undefined) {
					traverseChild(subdoc[key], subschema.values, path ? (path + '.' + key) : key, next);
				} else {
					next();
				}
			}, done);
		} else {
			done();
		}
	};

	Schema.asyncDocumentTransformers.map = function(subdoc, subschema, path, transformChild, done) {
		if(subdoc && typeof subdoc == 'object') {
			var newObj = {};
			async.eachSeries(Object.keys(subdoc), function(key, next) {
				if(subdoc[key] !== undefined) {
					transformChild(subdoc[key], subschema.values, path ? (path + '.' + key) : key, function(error, result) {
						if(error) return next(error);
						if(result !== undefined) newObj[key] = result;
						next();
					});
				} else {
					next(null, undefined);
				}
			}, function(error) {
				if(error) return done(error);
				done(null, newObj);
			});
		} else {
			done(null, undefined);
		}
	};

	Schema.subschemaGetters.map = function(subschema/*, pathComponent*/) {
		return subschema.values;
	};

	require('./normalizers').map = function(value, subschema, path) {
		return require('./normalizers').mixedobject(value, subschema, path);
	};

};

