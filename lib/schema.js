/*
This class represents a generic schema that is stored and accessible similarly to Mongoose schemas.
The schema's format is configurable on construction to some extent.  Internally, all type names
are stored as strings, although some shorthand values are permitted (ie, String constructor is an alias
for 'string').

The way schemas are stored internally is as a hierarchy of subschemas, where each subschema has a type
and any additional information associated with that subschema:
{
	type: 'object',
	properties: {
		foo: {
			type: 'string'
		},
		bar: {
			type: 'array',
			elements: {
				type: 'date'
			}
		}
	}
}
However, schemas are encouraged to be specified in shorthand notation:
{
	foo: String,
	bar: [Date]
}
Schemas given to the Schema constructor can be a mix of shorthand and expanded notation.
*/

/*
schemaData is mongoose-formatted schema data prior to normalization.  The schema is automatically normalized
when this constructor is called.  If there are errors in the schema format, an exception of a ZSError instance
may be thrown.

Options can contain:
- allowedTypes - An array of type strings allowed to be in the schema.  The default is:
['string', 'number', 'date', 'object', 'array', 'boolean', 'mixed', 'mixedobject']
Additionally, any types that result from the given typeMapper are considered allowed.
- typeMapper - A function that maps given types to string types.  If given, it should
be in the form function(givenType, subschema) and should return a string type, or null
if the type is not found.  If given, this overrides the default type mapper.
- typeTransformers - This should be a map from type strings to functions that validate
and transform a value of that type.  For example, a type transformer function for the
'number' type may accept either a JS number, or a string, and parse it if it's a string.
Validation errors should throw ZS
*/
function Schema(schemaData, options) {
	this.data = schemaData;
	this.options = options;
}

Schema.prototype._normalizeAndValidateSchemaData = function() {

};


