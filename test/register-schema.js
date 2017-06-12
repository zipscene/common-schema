// Copyright 2016 Zipscene, LLC
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

let expect = require('chai').expect;
let { createSchema, defaultSchemaFactory } = require('../lib');

describe('#registerSchema', function() {

	it('Should register a schema', function() {
		let Foo = createSchema({
			bars: [ {
				biz: Number,
				baz: String
			} ]
		});

		defaultSchemaFactory.registerSchema('Foo', Foo);

		expect(defaultSchemaFactory.getRegisteredSchema('Foo')).to.be.equal(Foo);
	});
});