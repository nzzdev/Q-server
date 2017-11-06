const Boom = require('boom');
const fetch = require('node-fetch');
const jsonSchemaRefParser = require('json-schema-ref-parser');

module.exports = {
  schema: {
    path: '/tools/{tool}/schema.json',
    method: 'GET',
    options: {
      description: 'Returns the dereferenced schema by proxying the renderer service for the given tool as defined in the environment',
      tags: ['api', 'editor']
    },
    handler: async (request, reply) => {
      const toolConfig = request.server.settings.app.tools.get(`/${request.params.tool}`);
      const dereferencedSchema = await getSchema(toolConfig, 'schema.json');
      if (!dereferencedSchema) {
        return Boom.notFound();
      }
      return dereferencedSchema;
    }
  },
  displayOptionsSchema: {
    path: '/tools/{tool}/display-options-schema.json',
    method: 'GET',
    options: {
      description: 'Returns the dereferenced schema by proxying the renderer service for the given tool as defined in the environment',
      tags: ['api', 'editor']
    },
    handler: async (request, reply) => {
      const dereferencedSchema = await getSchema(toolConfig, 'display-options-schema.json');
      if (!dereferencedSchema) {
        return Boom.notFound();
      }
      return dereferencedSchema;
    }
  }
}

async function getSchema(toolConfig, filename) {
  const response = await fetch(`${toolConfig.baseUrl}/${filename}`);

  if (!response.ok || response.status !== 200) {
    return null;
  }

  const schema = await response.json();
  const dereferencedSchema = await jsonSchemaRefParser.dereference(schema);

  // delete the definition property as we do not need it anymore in the dereferenced schema
  delete dereferencedSchema.definitions;

  return dereferencedSchema;
}
