let expect = require('chai').expect;
let createSchema = require('../lib').createSchema;

describe('#getSubschemaData', function() {

	it('basic functionality', function() {
		let schema = createSchema({
			foo: [ {
				bar: Number
			} ]
		});
		expect(schema.getSubschemaData('foo.8.bar'))
			.to.equal(schema.getData().properties.foo.elements.properties.bar);
	});

	it('root path', function() {
		let schema = createSchema(Number);
		expect(schema.getSubschemaData('')).to.equal(schema.getData());
	});

	it('not found', function() {
		let schema = createSchema({
			foo: Number
		});
		expect(schema.getSubschemaData('bar')).to.equal(undefined);
	});

});
