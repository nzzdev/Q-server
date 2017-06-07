const Boom = require('boom');
const fetch = require('node-fetch');
const jsonSchemaRefParser = require('json-schema-ref-parser');

module.exports = [
  {
    path: '/tools/{tool}/schema.json',
    method: 'GET',
    config: {
      description: 'Returns the dereferenced schema by proxying the renderer service for the given tool as defined in the environment',
      tags: ['api', 'editor']
    },
    handler: async (request, reply) => {
      const dereferencedSchema = await getSchema(request, 'schema.json');
      if (!dereferencedSchema) {
        return reply(Boom.notFound());
      }
      return reply(dereferencedSchema).type('application/json');
    }
  },
  {
    path: '/tools/{tool}/display-options-schema.json',
    method: 'GET',
    config: {
      description: 'Returns the dereferenced schema by proxying the renderer service for the given tool as defined in the environment',
      tags: ['api', 'editor']
    },
    handler: async (request, reply) => {
      const dereferencedSchema = await getSchema(request, 'display-options-schema.json');
      if (!dereferencedSchema) {
        return reply(Boom.notFound());
      }
      return reply(dereferencedSchema).type('application/json');
    }
  }
]

async function getSchema(request, filename) {
  const tool = request.server.settings.app.tools.get(`/${request.params.tool}`);
    
  const response = await fetch(`${tool.baseUrl}/${filename}`);

  if (!response.ok || response.status !== 200) {
    return null;
  }

  const schema = await response.json();
  const dereferencedSchema = await jsonSchemaRefParser.dereference(schema);

  // delete the definition property as we do not need it anymore in the dereferenced schema
  delete dereferencedSchema.definitions;

  return dereferencedSchema;
}
