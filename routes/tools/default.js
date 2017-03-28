const Joi = require('joi');
const Boom = require('boom');
const fetch = require('node-fetch');
const querystring = require('querystring');

module.exports = {
  path: '/tools/{tool}/{path*}',
  method: 'GET',
  config: {
    description: 'Proxies the request to the renderer service for the given tool as defined in the environment',
    tags: ['api', 'reader-facing'],
    validate: {
      params: {
        tool: Joi.string().required(),
        path: Joi.string().required()
      }
    }
  },
  handler: (request, reply) => {
    const tool = request.server.settings.app.tools.get(`/${request.params.tool}`);

    if (!tool) {
      return reply(Boom.notFound(`Tool ${request.params.tool} is not known`));
    }

    let queryString = '';
    if (request.query) {
      queryString = querystring.stringify(request.query);
    }

    return reply.proxy({
      uri: `${tool.baseUrl}/${request.params.path}?${queryString}`
    })

  }
}
