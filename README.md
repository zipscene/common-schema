# common-schema

`common-schema` provides a framework for handling schemas for data formats, and validating,
processing, and normalizing objects based on those schemas.

This README provides information on common use cases.  More extensive documentation is
available in the `docs` directory.

## Example

```js
let createSchema = require('common-schema').createSchema;

let schema = createSchema({
	foo: String,
	bar: {
		baz: [Number],
		qux: {
			type: Date,
			required: true
		}
	}
});

schema.validate({
	foo: 'Some String',
	bar: {
		baz: [ 1, 2, 3 ],
		qux: new Date()
	}
});	// true

schema.validate({
	foo: true,
	bar: {}
});	// throws with errors that foo is the wrong type and bar.qux is required

schema.normalize({
	foo: 5,
	bar: {
		baz: [ 1, '2', '3.5' ],
		qux: '2014-01-01T00:00:00Z'
	}
});
// Results in:
// {
//	foo: '5',
//	bar: {
//		baz: [ 1, 2, 3.5 ],
//		qux: new Date('2014-01-01T00:00:00Z')
//	}
// }
```

## Schema Format

Schemas are stored in a strict internal format, but shorter, easier-to-write schemas can be
supplied in several formats.

### Strict Format

```js
{
	type: 'object',
	properties: {
		foo: {
			type: 'string'
		},
		bar: {
			type: 'object',
			properties: {
				baz: {
					type: 'array',
					elements: {
						type: 'number'
					}
				},
				qux: {
					type: 'date',
					required: true
				}
			}
		}
	}
}
```

### Shorthands

If you do not need to specify any extra fields on the subschemas (such as `required`),
you can provide the raw type.  These are equivalent in this case:

```js
{ type: 'string' }
'string'
```

Many types offer shorthand, mongoose-style ways to specify the type.  These are usually
used by supplying the constructor of the Javascript type.  These are equivalent:

```js
{ type: 'string' }
'string'
{ type: String }
String
```

Objects and arrays have special shorthand syntax:

```js
{
	myObj: {
		prop1: String,
		prop2: Boolean
	},
	myArr: [ Date ]
}
```

is equivalent to:

```js
{
	type: 'object',
	properties: {
		myObj: {
			type: 'object',
			properties: {
				prop1: { type: 'string' },
				prop2: { type: 'boolean' }
			}
		},
		myArr: {
			type: 'array',
			elements: { type: 'date' }
		}
	}
}
```

## Validating and Normalizing

Calling `schema.validate(value)` will strictly validate the value against the schema.
This does not take into account type coercion or normalization.  For example, the value
`"5"` does not validate against the schema `Number`.

Calling `schema.normalize(value)` will attempt to coerce values into schema values.
Modification is done in-place as much as possible, and `schema.normalize()` returns
the result.  This will throw if it cannot coerce a value.

Both methods will throw `ValidationError` on error.
For situations in which this is undesirable,
`schema.isValid(value)` will return a `Boolean` rather than throwing an error.

### Validation Errors

`validate()` and `normalize()` throw a `ValidationError` (which can be accessed on
`require('common-schema').ValidationError`)
on failure.  A `ValidationError` looks like this (and inherits from XError and Error):

```js
{
	code: 'validation_error',
	message: 'Something human readable here',
	data: {
		fieldErrors: [	// note: only present sometimes
			{
				field: 'foo.bar.baz',	// path to invalid field
				code: 'too_large',		// machine-readable field error code
				message: 'Value is too big',	// human-readable message specific to field
				details: { ... }		// sometimes includes additional info
			},
			{
				// second error ...
			}
		]
	}
}
```

The `fieldError` code may be anything defined by the validation function, but the following values
are standard:

- `invalid_type` - If the field is the wrong type
- `invalid_format` - If the format of a string field does not match a regex or validation routine;
	details may optionally include a `regex` field.
- `required` - If a required field is missing
- `duplicate` - If a field required to be unique has a duplicate value
- `invalid` - Generic error code
- `too_small` - Numeric value is too small
- `too_large` - Numeric value is too large
- `too_short` - String is too short
- `too_long` - String is too long
- `unrecognized` - Unrecognized value in an enum; details may optionally contain an `enum` array
- `unknown_field` - If a supplied field does not have an attached schema

### Options

Both `validate()` and `normalize()` take a second argument; an `options` object.  This object can contain:

- `allowUnknownFields` - By default, an error is thrown if fields are
defined on an object that aren't defined on the schema.  If this is set to true, that error
is suppressed and unknown fields are passed through.
- `allowMissingFields` - By default, an error is thrown if a required
field is missing.  If this is true, required field errors are suppressed.
- `removeUnknownFields` - Only applies to `normalize()`.  Causes any unknown fields to be
removed from their object.
- `serialize` - Only applied to `normalize()`.  Causes the normalizers to output serializable
values.  Ie, dates will output ISO8601 strings instead of native `Date` objects.

## Recognized Types

### `"object"`

An object with defined child properties.  Subschema should include a `properties` object, which
is a map from property names to subschemas.

```js
createSchema({
	type: 'object',
	properties: {
		foo: { type: 'string' },
		bar: { type: 'string' }
	}
})
// Shorthand
createSchema({
	foo: String,
	bar: String
})
```

### `"array"`

An array of elements that share the same schema.  Subschema should include an `elements`
property which is the schema for array elements.

```js
createSchema({
	type: 'array',
	elements: {
		type: 'number'
	}
})
// Shorthand
createSchema([ Number ])
```

### `"map"`

A map (ie, object with variable keys) from strings to values that share the same schema.  The
subschema should include a `values` property which is the schema for the map values.  Use it like
this:

```js
createSchema({
	type: 'object',
	properties: {
		foo: {
			type: 'map',
			required: true,
			values: {
				type: 'number'
			}
		}
	}
})
// Shorthand
let map = require('common-schema').map;
createSchema({
	// required field foo that's a map from strings to numbers
	foo: map({
		required: true
	}, Number)
})
```

### `"or"`

Special type of subschema that can match one of two or more alternative subschemas.  For example,
to match a string, a number, or an object containing a string "bar":

```js
let or = require('common-schema').or;
createSchema({
	foo: or({
		required: true
	}, String, Number, { bar: String })
})
```

Note that using `or` with complex and similar subschemas (such as two objects) can incur an
additional performance penalty.

### `"string"` / `String`

Matches a string.  In `normalize()`, will coerce any data type by calling `.toString()`.  If used
as a component in an `or`, this will only match primitives (ie, it will not try to coerce objects
when used as part of `or`).

String schemas support these additional builtin validations:

```js
{
	type: String,
	minLength: 3,
	maxLength: 10,
	match: /^[a-z]*$/
}
```
Instead of using `match`, you could also use `enum`:
```js
{
	type: String,
	minLength: 3,
	maxLength: 10m
	enum: [ 'abc', 'efg', 'hij' ]
}
```

### `"number"` / `Number`

Matches a number.  Will coerce numeric strings by parsing as a float, and will coerce dates by
converting to millisecond unix timestamp.  Supports the additional builtin validations `min`
and `max`.

```js
{
	type: Number,
	min: 0,
	max: 100
}
```
Or use `enum`:
```js
{
	type: Number,
	enum: [ 23, 35, 40, 57 ]
}
```

### `"date"` / `Date`

Matches a date and time.  Will parse strings as ISO8601 times.  Will parse numbers as UNIX
timestamps in milliseconds.  Supports `min` and `max` validators.  Serializes into ISO8601
strings.

### `"binary"` / `Buffer`

Binary data.  The native type for this is `Buffer` .  It will parse strings as base64 and
will also accept arrays of numbers (byte values).  Serializes into a base64 string.

### `"boolean"` / `Boolean`

Will coerce the following: "yes"/"no", "true"/"false", "t"/"f", "yes"/"no", "y"/"n",
"1"/"0", 1/0, "on"/"off", "totallydude"/"definitelynot".

### `"mixed"` / Mixed

Wildcard type; can be anything.  Use like this:

```js
let Mixed = require('common-schema').Mixed;
createSchema({
	foo: Mixed
})
```

## Custom Validators and Normalizers

You can specify custom validator and normalizer functions inside of a schema.  The validator
should strictly validate the value, and is called after the normalizer when normalizing.  When
normalizing, the defined normalized is called after the standard normalizer.

Any validation errors should be reported by throwing a `FieldError`.

```js
createSchema({
	foo: {
		type: String,
		validate: function(value, subschema, fieldPath, validateOptions) {
			if (value[0] !== 'x') {
				throw new commonSchema.FieldError('invalid', 'First character must be x');
			}
		},
		normalize: function(value, subschema, fieldPath, normalizeOptions) {
			return value.toLowerCase();
		}
	}
})
```

## Other

Functions are also provided for the following:

- Traversing the schema
- Traversing an object alongside the schema
- Transforming an object while traversing
- Transforming an object while traversing asynchronously

See the `docs` directory for details.


## Custom Types

All schemas are created by a `SchemaFactory` that maintains the set of allowed types in the
schema.  The exposed `createSchema` function is actually an alias to `createSchema` on a default
factory.

To create a custom type:

1. Instantiate a new `SchemaFactory`.
1. Subclass `SchemaType` or an existing type class, and override the appropriate methods.  See
the default types for examples.
1. Register the new type with the `SchemaFactory`.

You can also use this process to override or extend existing types (for example, if you need to
normalize a type into a different format for a specific database).

```js
let SchemaFactory = require('common-schema').SchemaFactory;
let SchemaTypeDate = require('common-schema').coreSchemaTypes.SchemaTypeDate;

class YearSerializedDate extends SchemaTypeDate {

	constructor() {
		super();
	}

	normalize(value, subschema, field, options, schema) {
		value = super.normalize(value, subschema, field, {}, schema);
		if (options.serialize) {
			return '' + value.getUTCYear();
		} else {
			return value;
		}
	}

}

let mySchemaFactory = new SchemaFactory();
mySchemaFactory.registerType('date', new YearSerializedDate());
let schema = mySchemaFactory.createSchema(...);
```

## Miscellaneous methods

You can use `Schema.isSchema` to test whether a given value is a schema instance.

```javascript
Schema.isSchema(createSchema({ foo: String }));
// => true

Schema.isSchema('bar');
// => false
```
