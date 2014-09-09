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

function Map(params) {
	this.type = 'map';
	for(var key in params) {
		this[key] = params[key];
	}
}

Map.prototype.normalizeSchema = function(subschema, path, normalizeSubschema) {
	if(!subschema.values) throw new ZSError(ZSError.INVALID_OBJECT, 'Map schema requires values subschema');
	subschema.values = normalizeSubschema(subschema.values, path ? (path + '.values') : 'values');
};

Map.prototype.schemaTraverse = function(subdoc, subschema, path, traverseChild) {
	if(subdoc && typeof subdoc == 'object') {
		for(var key in subdoc) {
			if(subdoc[key] !== undefined) {
				traverseChild(subdoc[key], subschema.values, path ? (path + '.' + key) : key);
			}
		}
	}
};

Map.prototype.schemaTransform = function(subdoc, subschema, path, transformChild) {
	console.log('Transforming map');
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

Map.prototype.schemaTraverseSchema = function(subschema, path, traverseChild) {
	traverseChild(subschema.values, path);
};

Map.prototype.schemaTraverseAsync = function(subdoc, subschema, path, traverseChild, done) {
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

Map.prototype.schemaTransformAsync = function(subdoc, subschema, path, transformChild, done) {
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

Map.prototype.getSubschema = function(subschema/*, pathComponent*/) {
	return subschema.values;
};

Map.prototype.schemaNormalizeValue = function(value, subschema, path) {
	return require('./normalizers').mixedobject(value, subschema, path);
};


module.exports = function(params) {
	if(!params) return { type: 'mixedobject' };	// with no key or value type, just use an abitrary type
	return new Map(params);
};
