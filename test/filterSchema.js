const expect = require('chai').expect;
const createSchema = require('../lib').createSchema;
const XError = require('xerror');

describe('#filterSchema', function() {
	it('includes entire subchemas for which fn returns true', function() {
		let schema = createSchema({
			foo: {
				type: 'object',
				include: true,
				properties: {
					bar: {
						type: String
					}
				}
			},
			baz: {
				type: String
			}
		});

		let filtered = schema.filterSchema((subschema) => subschema.include);

		expect(filtered.getData()).to.deep.equal({
			type: 'object',
			properties: {
				foo: {
					type: 'object',
					include: true,
					properties: {
						bar: {
							type: 'string'
						}
					}
				}
			}
		});
	});

	it('traverses into subschemas for which fn returns null or undefined', function() {
		let schema = createSchema({
			foo: {
				type: 'object',
				include: null,
				properties: {
					bar: {
						type: String,
						include: true
					},
					baz: {
						type: String
					}
				}
			},
			qux: {
				blah: {
					type: String,
					include: true
				},
				ech: {
					type: String
				}
			}
		});

		let filtered = schema.filterSchema((subschema) => subschema.include);

		expect(filtered.getData()).to.deep.equal({
			type: 'object',
			properties: {
				foo: {
					type: 'object',
					properties: {
						bar: {
							type: 'string',
							include: true
						}
					}
				},
				qux: {
					type: 'object',
					properties: {
						blah: {
							type: 'string',
							include: true
						}
					}
				}
			}
		});
	});

	it('does not traverse into subschemas for which fn returns false', function() {
		let schema = createSchema({
			foo: {
				type: 'object',
				include: false,
				properties: {
					bar: {
						type: String,
						include: true
					}
				}
			}
		});

		let filtered = schema.filterSchema((subschema) => subschema.include);

		expect(filtered.getData()).to.deep.equal({
			type: 'object',
			properties: {}
		});
	});

	it('throws when fn returns anything else', function() {
		let schema = createSchema({
			foo: {
				type: 'object',
				properties: {}
			}
		});
		let fn = () => 'something else';

		expect(() => schema.filterSchema(fn)).to.throw(XError);
	});

	it('correctly handles array schemas', function() {
		let schema = createSchema([ {
			foo: {
				type: String,
				include: true
			},
			bar: {
				type: String
			}
		} ]);

		let filtered = schema.filterSchema((subschema) => subschema.include);

		expect(filtered.getData()).to.deep.equal({
			type: 'array',
			elements: {
				type: 'object',
				properties: {
					foo: {
						type: 'string',
						include: true
					}
				}
			}
		});
	});

	it('correctly handles array subschemas', function() {
		let schema = createSchema({
			foo: [ {
				bar: {
					type: String,
					include: true
				},
				baz: {
					type: String
				},
				qux: [
					{
						blah: {
							type: String,
							include: true
						}
					}
				]
			} ],
			ech: [ {
				type: String
			} ]
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
								type: 'string',
								include: true
							},
							qux: {
								type: 'array',
								elements: {
									type: 'object',
									properties: {
										blah: {
											type: 'string',
											include: true
										}
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
