let expect = require('chai').expect;
let createSchema = require('../lib').createSchema;

describe('#traverseSchema', function() {

	it('traverse', function(done) {

		let types = [];
		let paths = [];

		let schema = createSchema({
			foo: {
				bar: Number,
				baz: String
			}
		});

		schema.traverseSchema({
			onSubschema(subschema, path) {
				types.push(subschema.type);
				paths.push(path);
			}
		});

		expect(types).to.deep.equal([ 'object', 'object', 'number', 'string' ]);
		expect(paths).to.deep.equal([ '', 'foo', 'foo.bar', 'foo.baz' ]);
		done();

	});

	it('should stop traversing a path if it returns false', function(done) {
		let types = [];
		let paths = [];

		let schema = createSchema({
			foo: [ {
				bar: Number,
				baz: String
			} ],
			bat: Number
		});

		schema.traverseSchema({
			onSubschema(subschema, path) {
				types.push(subschema.type);
				paths.push(path);
				if (subschema.type === 'array') {
					return false;
				}
			}
		});

		expect(types).to.deep.equal([ 'object', 'array', 'number' ]);
		expect(paths).to.deep.equal([ '', 'foo', 'bat' ]);
		done();
	});

});
