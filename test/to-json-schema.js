const expect = require('chai').expect;
const createSchema = require('../lib').createSchema;
let or = require('../lib').or;
let map = require('../lib').map;

describe('#toJSONSchema', function() {

	describe('test 1', function() {
		const commonSchema = {
			foo: {
				bar1: String,
				bar2: { type: String, required: true, description: 'bar2' },
				bar3: { type: String, required: true }
			},
			baz: [ Number ],
			biz: {
				type: Number,
				min: 5,
				max: 10
			},
			boop: {
				type: String,
				minLength: 1,
				maxLength: 3,
				enum: [ 'a', 'b', 'c' ]
			},
			beep: Date,
			bip: Boolean,
			zip: 'mixed',
			zap: 'geopoint',
			map: {
				type: 'map',
				values: {
					map2: map(Number)
				}
			},
			o: or({}, Number, String, {
				qux: {
					type: Number,
					required: true
				},
				bam: String,
				o2: or({}, Number, String, {
					qux: {
						type: Number,
						required: true
					},
					bam: String
				})
			})
		};
		const jsonSchema = {
			type: 'object',
			properties: {
				foo: {
					type: 'object',
					properties: {
						bar1: {
							type: 'string'
						},
						bar2: {
							type: 'string',
							description: 'bar2'
						},
						bar3: {
							type: 'string'
						}
					},
					required: [
						'bar2',
						'bar3'
					]
				},
				baz: {
					type: 'array',
					items: {
						type: 'number'
					}
				},
				biz: {
					type: 'number'
				},
				boop: {
					type: 'string',
					minLength: 1,
					maxLength: 3,
					enum: [
						'a',
						'b',
						'c'
					]
				},
				beep: {
					type: 'string',
					pattern: '^d{4}(-dd(-dd(Tdd:dd(:dd)?(.d+)?(([+-]dd:dd)|Z)?)?)?)?$'
				},
				bip: {
					type: 'boolean'
				},
				zip: {},
				zap: {
					type: 'array',
					items: {
						type: 'number'
					},
					minItems: 2,
					maxItems: 2,
					description: 'Longitude, Latitude'
				},
				map: {
					type: 'object',
					'properties': {
						type: 'object',
						properties: {
							map2: {
								type: 'object',
								properties: {
									type: 'number'
								}
							}
						}
					}
				},
				o: {
					anyOf: [
						{
							type: 'number'
						},
						{
							type: 'string'
						},
						{
							'type': 'object',
							properties: {
								qux: {
									type: 'number'
								},
								bam: {
									type: 'string'
								},
								o2: {
									anyOf: [
										{
											type: 'number'
										},
										{
											type: 'string'
										},
										{
											'type': 'object',
											properties: {
												qux: {
													type: 'number'
												},
												bam: {
													type: 'string'
												}
											},
											required: [ 'qux' ]
										}
									]
								}
							},
							required: [ 'qux' ]
						}
					]
				}

			}
		};
		let schema = createSchema(commonSchema);
		let converted = schema.toJSONSchema();
		console.log(JSON.stringify(converted, null, '\t'));
		expect(converted).to.deep.equal(jsonSchema);
	});

});

