let expect = require('chai').expect;
let createSchema = require('../lib').createSchema;

describe('#traverseSchema', function() {

	it('traverse', function() {

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

	});

});
