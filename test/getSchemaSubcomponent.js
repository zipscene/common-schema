let expect = require('chai').expect;
let createSchema = require('../lib').createSchema;
let or = require('../lib').or;
let map = require('../lib').map;

describe('#getFieldSubschema', function() {

	it('object', function() {
		let schema = createSchema({
			foo: Number
		});
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'foo',
			schema
		)).to.deep.equal( { type: 'number' } );
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'bar',
			schema
		)).to.deep.equal(undefined);
	});

	it('array', function() {
		let schema = createSchema([ Number ]);
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'17',
			schema
		)).to.deep.equal( { type: 'number' } );
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'length',
			schema
		)).to.deep.equal(undefined);
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'$',
			schema
		)).to.deep.equal( { type: 'number' } );
	});

	it('map', function() {
		let schema = createSchema(map(Number));
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'foo',
			schema
		)).to.deep.equal( { type: 'number' } );
	});

	it('or', function() {
		let schema = createSchema(or(Number, { foo: Number }, { bar: String }));
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'foo',
			schema
		)).to.deep.equal( { type: 'number' } );
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'bar',
			schema
		)).to.deep.equal( { type: 'string' } );
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'baz',
			schema
		)).to.deep.equal(undefined);
	});

	it('primitive', function() {
		let schema = createSchema(Number);
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'foo',
			schema
		)).to.deep.equal(undefined);
	});

});
