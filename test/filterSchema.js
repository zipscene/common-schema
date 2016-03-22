let expect = require('chai').expect;
let createSchema = require('../lib').createSchema;

describe('#filterSchema', function() {
	it('returns a copy including only subschemas for which test returns true', function() {
		let schema = createSchema({
			foo: [ {
				bar: {
					baz: {
						type: String,
						include: true
					},
					qux: {
						type: Number
					},
					asdf: {
						type: Number,
						include: true
					}
				}
			} ],
			blah: [
				{
					ech: {
						type: String
					}
				}
			]
		});

		let filtered = schema.filterSchema((subschema) => subschema.include);

		expect(filtered.getData()).to.deep.equal({
			type: 'object',
			properties: {
				foo: {
					type: 'array',
					elements: {
						type: 'object',
						properties: {
							bar: {
								type: 'object',
								properties: {
									baz: {
										type: 'string',
										include: true
									},
									asdf: {
										type: 'number',
										include: true
									}
								}
							}
						}
					}
				}
			}
		});
	});
});
