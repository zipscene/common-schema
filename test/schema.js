// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

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

	const testSchema1 = createSchema({
		foo: String,
		bar: { type: 'map', values: Number },
		baz: {
			biz: {
				buz: Boolean
			}
		},
		arr: [ {
			zip: String
		} ]
	});

	it('#listFields', function() {
		const expected = [ 'foo', 'bar', 'baz', 'baz.biz', 'baz.biz.buz', 'arr' ];
		const actual = testSchema1.listFields();
		expect(actual).to.deep.equal(expected);
	});

	it('#listFields no stopAtArrays', function() {
		const expected = [ 'foo', 'bar', 'baz', 'baz.biz', 'baz.biz.buz', 'arr', 'arr.zip' ];
		const actual = testSchema1.listFields({ stopAtArrays: false  });
		expect(actual).to.deep.equal(expected);
	});

	it('#listFields includePathArrays', function() {
		const expected = [ 'foo', 'bar', 'bar.$', 'baz', 'baz.biz', 'baz.biz.buz', 'arr', 'arr.$', 'arr.$.zip' ];
		const actual = testSchema1.listFields({ stopAtArrays: false, includePathArrays: true });
		expect(actual).to.deep.equal(expected);
	});

	it('#listFields maxDepth', function() {
		const expected = [ 'foo', 'bar', 'baz', 'baz.biz', 'arr' ];
		const actual = testSchema1.listFields({ maxDepth: 2  });
		expect(actual).to.deep.equal(expected);
	});

	it('#listFields onlyLeaves', function() {
		const expected = [ 'foo', 'bar', 'baz.biz.buz', 'arr' ];
		const actual = testSchema1.listFields({ onlyLeaves: true });
		expect(actual).to.deep.equal(expected);
	});


});
