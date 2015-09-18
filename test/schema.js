let expect = require('chai').expect;
let { Schema, createSchema } = require('../lib');

describe('Schema', function() {
	it('::isSchema', function() {
		let schema = createSchema({ foo: String });

		expect(Schema.isSchema(schema)).to.be.true;
		expect(Schema.isSchema('foo')).to.be.false;
		expect(Schema.isSchema(true)).to.be.false;
		expect(Schema.isSchema(64)).to.be.false;
		expect(Schema.isSchema({ foo: 'bar' })).to.be.false;
		expect(Schema.isSchema([ 4, 16, 256 ])).to.be.false;
		expect(Schema.isSchema(/foo/)).to.be.false;
		expect(Schema.isSchema(new Date())).to.be.false;
	});
});
