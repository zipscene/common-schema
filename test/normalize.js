let expect = require('chai').expect;
let createSchema = require('../lib').createSchema;
let ValidationError = require('../lib').ValidationError;
let Mixed = require('../lib').Mixed;
let or = require('../lib').or;
let FieldError = require('../lib').FieldError;

describe('#normalize', function() {

	it('raw string', function() {
		let schema = createSchema({
			type: 'string'
		});
		expect(schema.normalize('foo')).to.equal('foo');
		expect(schema.normalize(3)).to.equal('3');
		expect(schema.normalize(3)).to.not.equal(3);
		expect(schema.normalize(false)).to.equal('false');
	});

	it('shorthand string', function() {
		let schema = createSchema(String);
		expect(schema.normalize('foo')).to.equal('foo');
		expect(schema.normalize(3)).to.equal('3');
		expect(schema.normalize(3)).to.not.equal(3);
		expect(schema.normalize(false)).to.equal('false');
	});

	it('object', function() {
		let schema = createSchema({
			type: 'object',
			properties: {
				foo: {
					type: 'string'
				},
				bar: {
					type: 'string'
				}
			}
		});
		expect(schema.normalize({ foo: 3 })).to.deep.equal({ foo: '3' });
		expect(schema.normalize({ bar: 3 })).to.deep.equal({ bar: '3' });
		expect(schema.normalize({ foo: 3, bar: 3 })).to.deep.equal({ foo: '3', bar: '3' });
		expect(() => schema.normalize(3)).to.throw(ValidationError);
	});

	it('shorthand object', function() {
		let schema = createSchema({
			foo: String,
			bar: String
		});
		expect(schema.getData()).to.deep.equal({
			type: 'object',
			properties: {
				foo: {
					type: 'string'
				},
				bar: {
					type: 'string'
				}
			}
		});
		expect(schema.normalize({ foo: 3 })).to.deep.equal({ foo: '3' });
		expect(schema.normalize({ bar: 3 })).to.deep.equal({ bar: '3' });
		expect(schema.normalize({ foo: 3, bar: 3 })).to.deep.equal({ foo: '3', bar: '3' });
		expect(() => schema.normalize(3)).to.throw(ValidationError);
	});

	it('shorthand object type', function() {
		let schema = createSchema({
			type: {
				foo: Number
			}
		});
		expect(schema.normalize({ foo: '3' })).to.deep.equal({ foo: 3 });
	});

	it('shorthand array type', function() {
		let schema = createSchema({
			type: [ Number ]
		});
		expect(schema.normalize([ '3' ])).to.deep.equal([ 3 ]);
	});

	it('string errors', function() {
		let schema = createSchema({
			type: String,
			minLength: 4,
			maxLength: 8,
			match: /foo/
		});
		expect(schema.normalize('fooa')).to.equal('fooa');
		expect(schema.normalize('fooasdfg')).to.equal('fooasdfg');
		expect(() => schema.normalize('foo')).to.throw(ValidationError);
		expect(() => schema.normalize('fooasdfgh')).to.throw(ValidationError);
		expect(() => schema.normalize('bara')).to.throw(ValidationError);
	});

	it('required and missing fields', function() {
		let schema = createSchema({
			foo: {
				type: String,
				required: true
			}
		});
		expect(schema.normalize({ foo: 3 })).to.deep.equal({ foo: '3' });
		expect(() => schema.normalize({})).to.throw(ValidationError);
		expect(() => schema.normalize({ foo: 3, bar: 3 })).to.throw(ValidationError);
		expect(schema.normalize({ foo: 3, bar: 3 }, { allowUnknownFields: true }))
			.to.deep.equal({ foo: '3', bar: 3 });
		expect(schema.normalize({}, { allowMissingFields: true })).to.deep.equal({});
		expect(schema.normalize({ foo: 3, bar: 3 }, { removeUnknownFields: true }))
			.to.deep.equal({ foo: '3' });
	});

	it('array', function() {
		let schema = createSchema({
			type: 'array',
			elements: {
				type: 'string'
			}
		});
		expect(schema.normalize([ 2, 3 ])).to.deep.equal([ '2', '3' ]);
		expect(() => schema.normalize({})).to.throw(ValidationError);
	});

	it('shorthand array', function() {
		let schema = createSchema({
			foo: [ {
				bar: String
			} ]
		});
		expect(schema.normalize({
			foo: [
				{
					bar: 3
				},
				{
					bar: 4
				}
			]
		})).to.deep.equal({
			foo: [
				{
					bar: '3'
				},
				{
					bar: '4'
				}
			]
		});
	});

	it('array empty elements', function() {
		let schema = createSchema([ String ]);
		expect(schema.normalize([])).to.deep.equal([]);
		expect(schema.normalize([ 3 ])).to.deep.equal([ '3' ]);
		expect( () => schema.normalize([ 3, undefined ]) ).to.throw(ValidationError);
	});

	it('map', function() {
		let schema = createSchema({
			type: 'map',
			values: String
		});
		expect(schema.normalize({
			foo: 5,
			bar: 6,
			baz: 7
		})).to.deep.equal({
			foo: '5',
			bar: '6',
			baz: '7'
		});
	});

	it('enum', function() {
		let schema = createSchema({
			type: String,
			enum: [
				'foo',
				'bar',
				'1'
			]
		});
		expect(schema.normalize('foo')).to.equal('foo');
		expect(schema.normalize('bar')).to.equal('bar');
		expect(schema.normalize(1)).to.equal('1');
		expect( () => schema.normalize('baz') ).to.throw(ValidationError);
	});

	it('or string/number', function() {
		let schema = createSchema(or({}, String, Number));
		expect(schema.normalize('abc')).to.equal('abc');
		expect(schema.normalize(123)).to.equal(123);
		expect(schema.normalize('123')).to.equal('123');
		expect(schema.normalize(true)).to.equal('true');
		expect(schema.normalize({})).to.equal('[object Object]');
	});

	it('or without schema options', function() {
		let schema = createSchema(or(String, Number));
		expect(schema.normalize('abc')).to.equal('abc');
		expect(schema.normalize(123)).to.equal(123);
	});

	it('or boolean/number', function() {
		let schema = createSchema(or({}, Boolean, Number));
		expect(schema.normalize(1)).to.equal(1);
		expect(schema.normalize('1')).to.equal(true);
		expect(schema.normalize('2')).to.equal(2);
		expect(schema.normalize('true')).to.equal(true);
		expect( () => schema.normalize('foo') ).to.throw(ValidationError);
	});

	it('or boolean/number/string', function() {
		let schema = createSchema(or({}, Boolean, Number, String));
		expect(schema.normalize(1)).to.equal(1);
		expect(schema.normalize('1')).to.equal('1');
		expect(schema.normalize('2')).to.equal('2');
		expect(schema.normalize('true')).to.equal('true');
		expect(schema.normalize(true)).to.equal(true);
		expect(schema.normalize('foo')).to.equal('foo');
	});

	it('or string/object', function() {
		let schema = createSchema(or({}, String, {
			foo: {
				type: Number,
				required: true
			},
			bar: Number
		}));
		expect(schema.normalize({ foo: 123 })).to.deep.equal({ foo: 123 });
		expect(schema.normalize({ foo: 1, bar: '123' })).to.deep.equal({ foo: 1, bar: 123 });
		expect(schema.normalize(12)).to.equal('12');
		expect( () => schema.normalize({ bar: 123 }) ).to.throw(ValidationError);
	});

	it('or object/object', function() {
		let schema = createSchema(or({}, {
			foo: {
				bar: { type: String, required: true }
			}
		}, {
			baz: {
				qux: { type: String, required: true }
			}
		}));
		expect(schema.normalize({ foo: { bar: 'bar' } })).to.deep.equal({ foo: { bar: 'bar' } });
		expect(schema.normalize({ baz: { qux: 'qux' } })).to.deep.equal({ baz: { qux: 'qux' } });
		expect( () => schema.normalize( { foo: {} }) ).to.throw(ValidationError);
	});

	it('or enums', function() {
		let schema = createSchema(or({}, {
			type: String,
			enum: [ 'foo' ]
		}, {
			type: String,
			enum: [ 'bar' ]
		}));
		expect(schema.normalize('foo')).to.equal('foo');
		expect(schema.normalize('bar')).to.equal('bar');
		expect( () => schema.normalize('qux') ).to.throw(ValidationError);
	});

	it('defaults', function() {
		let schema = createSchema({
			foo: {
				type: String,
				default: 5
			}
		});
		expect(schema.normalize({})).to.deep.equal({ foo: '5' });
	});

	it('number', function() {
		let schema = createSchema({
			type: Number,
			min: 5,
			max: 10,
			minError: 'foobar'
		});
		expect(schema.normalize(5)).to.equal(5);
		expect(schema.normalize(10)).to.equal(10);
		expect(schema.normalize('6.5')).to.equal(6.5);
		expect(() => schema.normalize('')).to.throw(ValidationError);
		expect(() => schema.normalize('123a')).to.throw(ValidationError);
		expect(() => schema.normalize(11)).to.throw(ValidationError);
		expect(() => schema.normalize(4)).to.throw(ValidationError);
		expect(() => schema.normalize(4)).to.throw('foobar');
	});

	it('date', function() {
		let schema = createSchema({
			type: Date,
			min: new Date('2010-01-01T00:00:00Z'),
			max: '2016-01-01T00:00:00Z',
			default: function() {
				return new Date('2014-01-01T00:00:00Z');
			}
		});
		expect(schema.normalize(new Date('2014-01-01T00:00:00Z')).getTime())
			.to.equal(new Date('2014-01-01T00:00:00Z').getTime());
		expect(schema.normalize(1388534400000).getTime())
			.to.equal(new Date('2014-01-01T00:00:00Z').getTime());
		expect(schema.normalize('2014-01-01T00:00:00Z').getTime())
			.to.equal(new Date('2014-01-01T00:00:00Z').getTime());
		expect(schema.normalize(undefined).getTime())
			.to.equal(new Date('2014-01-01T00:00:00Z').getTime());
		expect(() => schema.normalize('2009-01-01T00:00:00Z')).to.throw(ValidationError);
		expect(() => schema.normalize('2017-01-01T00:00:00Z')).to.throw(ValidationError);
	});

	it('binary', function() {
		let schema = createSchema(Buffer);
		expect(schema.normalize('AQIDBAU=').toString('base64')).to.equal('AQIDBAU=');
		expect(schema.normalize([ 1, 2, 3, 4, 5 ]).toString('base64')).to.equal('AQIDBAU=');
		expect(schema.normalize(new Buffer([ 1, 2, 3, 4, 5 ])).toString('base64')).to.equal('AQIDBAU=');
	});

	it('boolean', function() {
		let schema = createSchema(Boolean);
		expect(schema.normalize(true)).to.equal(true);
		expect(schema.normalize('false')).to.equal(false);
		expect(schema.normalize(0)).to.equal(false);
		expect( () => schema.normalize('zip') ).to.throw(ValidationError);
	});

	it('mixed', function() {
		let schema = createSchema(Mixed);
		let obj = {
			foo: 12,
			bar: {
				baz: 'abc'
			}
		};
		expect(schema.normalize(obj)).to.equal(obj);
	});

	it('mixed with serializeMixed', function() {
		let schema = createSchema({
			foo: Number,
			bar: {
				type: 'mixed',
				serializeMixed: true
			}
		});
		let obj = {
			foo: 12,
			bar: {
				baz: 'abc'
			}
		};
		let normalized = schema.normalize(obj, { serialize: true });
		expect(normalized).to.deep.equal({
			foo: obj.foo,
			bar: '{"baz":"abc"}'
		});
	});

	it('geopoint', function() {
		let schema = createSchema('geopoint');
		expect(schema.normalize([ -102, 78 ])).to.deep.equal([ -102, 78 ]);
		expect(schema.normalize([ '-102', '78' ])).to.deep.equal([ -102, 78 ]);
		expect(schema.normalize('-102,78')).to.deep.equal([ -102, 78 ]);
		expect( () => schema.normalize([ -181, 78 ]) ).to.throw(ValidationError);
		expect( () => schema.normalize(true) ).to.throw(ValidationError);
	});

	it('geojson', function() {
		let schema = createSchema('geojson');
		expect(schema.normalize({
			type: 'Point',
			coordinates: [ '12', '12' ]
		})).to.deep.equal({
			type: 'Point',
			coordinates: [ 12, 12 ]
		});
		expect(schema.normalize({
			type: 'GeometryCollection',
			geometries: [
				{
					type: 'Polygon',
					coordinates: [ [ [ 12, 12 ], '13,13', [ 13, 12 ], [ 12, 12 ] ] ]
				}
			]
		})).to.deep.equal({
			type: 'GeometryCollection',
			geometries: [
				{
					type: 'Polygon',
					coordinates: [ [ [ 12, 12 ], [ 13, 13 ], [ 13, 12 ], [ 12, 12 ] ] ]
				}
			]
		});
	});

	it('custom normalizer and validator', function() {
		let schema = createSchema({
			type: String,
			normalize: function(str) {
				return str + 'x';
			},
			validate: function(str) {
				if (str[0] !== 'a') {
					throw new FieldError('invalid', 'Test validator');
				}
			}
		});
		expect(schema.normalize('afoo')).to.equal('afoox');
		expect( () => schema.normalize('foo') ).to.throw(ValidationError);
		expect( () => schema.normalize('foo') ).to.throw('Test validator');
	});

	it('custom normalizer with regex', function() {
		let schema = createSchema({
			foo: {
				type: String,
				match: /^[a-z]{2,2}$/,
				normalize(value) {
					if (value && typeof value.toLowerCase === 'function') {
						return value.toLowerCase();
					} else {
						throw new Error('Not a string');
					}
				}
			}
		});
		let obj = {
			foo: 'US'
		};
		obj = schema.normalize(obj);
		expect(obj.foo).to.equal('us');
	});

});
