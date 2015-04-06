let expect = require('chai').expect;
let createSchema = require('../lib').createSchema;
let ValidationError = require('../lib').ValidationError;
let Mixed = require('../lib').Mixed;
let or = require('../lib').or;
let map = require('../lib').map;

describe('#validate', function() {

	const schema = createSchema({
		foo: {
			bar: String,
			baz: Number
		},
		miss: Date,
		arr: [ {
			zip: Date
		} ],
		map: map(Number),
		bin: Buffer,
		boo: Boolean,
		mix: Mixed,
		o: or({}, Number, String, {
			qux: {
				type: Number,
				required: true
			},
			bam: String
		})
	});

	it('valid', function() {
		expect(schema.validate({
			foo: {
				bar: '8',
				baz: 8
			},
			arr: [
				{
					zip: new Date('2014-01-01T00:00:00Z')
				},
				{
					zip: new Date(1427982068722)
				},
				{
					zip: new Date()
				},
				{}
			],
			map: {
				foo: 2,
				bar: 4
			},
			bin: new Buffer('YXNkZg==', 'base64'),
			boo: true,
			mix: { a: [ function() {} ], b: 5 },
			o: {
				qux: 4,
				bam: '7'
			}
		})).to.equal(true);
	});

	it('invalid', function() {
		const expectedErrors = [
			{
				'field': 'foo.bar',
				'code': 'invalid_type',
				'message': 'Must be a string'
			},
			{
				'field': 'foo.baz',
				'code': 'invalid_type',
				'message': 'Must be a number'
			},
			{
				'field': 'arr.0.zip',
				'code': 'invalid_type',
				'message': 'Must be a date'
			},
			{
				'field': 'arr.1.zip',
				'code': 'invalid_type',
				'message': 'Must be a date'
			},
			{
				'field': 'map.bar',
				'code': 'invalid_type',
				'message': 'Must be a number'
			},
			{
				'field': 'bin',
				'code': 'invalid_type',
				'message': 'Must be a buffer'
			},
			{
				'field': 'boo',
				'code': 'invalid_type',
				'message': 'Must be a boolean'
			},
			{
				'field': 'o.qux',
				'code': 'invalid_type',
				'message': 'Must be a number'
			}
		];

		try {
			schema.validate({
				foo: {
					bar: 8,
					baz: '8'
				},
				arr: [
					{
						zip: '2014-01-01T00:00:00Z'
					},
					{
						zip: 1427982068722
					},
					{
						zip: new Date()
					},
					{}
				],
				map: {
					foo: 2,
					bar: '4'
				},
				bin: 'YXNkZg==',
				boo: 'yes',
				mix: { a: [ function() {} ] },
				o: {
					qux: '4',
					bam: '7'
				}
			});
		} catch (ex) {
			expect(ex instanceof ValidationError).to.equal(true);
			expect(ex.data.fieldErrors).to.deep.equal(expectedErrors);
			return;
		}
		throw new Error('Should not reach');
	});

});
