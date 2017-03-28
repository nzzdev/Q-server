const Boom = require('boom');
const fetch = require('node-fetch');
const jsonSchemaRefParser = require('json-schema-ref-parser');

module.exports = {
  path: '/tools/{tool}/schema.json',
  method: 'GET',
  config: {
    description: 'Returns the dereferenced schema by proxying the renderer service for the given tool as defined in the environment',
    tags: ['api', 'editor']
  },
  handler: async (request, reply) => {
    const tool = request.server.settings.app.tools.get(`/${request.params.tool}`);
    
    const response = await fetch(`${tool.baseUrl}/schema.json`);

    if (!response.ok || response.status !== 200) {
      return reply(Boom.notFound());
    }

    const schema = await response.json();
    const dereferencedSchema = await jsonSchemaRefParser.dereference(schema);

    // delete the definition property as we do not need it anymore in the dereferenced schema
    delete dereferencedSchema.definitions;

    return reply(dereferencedSchema).type('application/json');
  }
}
