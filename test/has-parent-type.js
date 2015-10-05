let expect = require('chai').expect;
let { createSchema, SchemaError } = require('../lib');

describe('#hasParentType', function() {

	it('should return true for found type', function() {
		let schema = createSchema({
			foo: [ {
				bar: Number
			} ]
		});
		expect(schema.hasParentType('foo.bar', 'array')).to.be.true;
	});

	it('should return false for no found type', function() {
		let schema = createSchema({
			foo: {
				bar: Number
			}
		});
		expect(schema.hasParentType('foo.bar', 'array')).to.be.false;
	});

	it('should skip last field if requested', function() {
		let schema = createSchema({
			foo: {
				bar: [ Number ]
			}
		});
		expect(schema.hasParentType('foo.bar', 'array')).to.be.true;
		expect(schema.hasParentType('foo.bar', 'array', {
			skipLastField: true
		})).to.be.false;
	});

	it('should throw on invlid call', function() {
		let schema = createSchema({
			foo: {
				bar: Number
			}
		});
		expect(() => schema.hasParentType('foo.baz', 'array'))
			.to.throw(SchemaError, 'Did not find field in schema');
	});

});
