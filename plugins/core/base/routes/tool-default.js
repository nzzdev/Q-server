const Joi = require('joi');
const Boom = require('boom');
const Wreck = require('wreck');
const querystring = require('querystring');

async function handler(options, request, h, payload = null) {
  const tool = request.server.settings.app.tools.get(`/${request.params.tool}`);

  if (!tool) {
    return Boom.notFound(`Tool ${request.params.tool} is not known`);
  }

  let queryString = '';
  if (request.query) {
    queryString = querystring.stringify(request.query);
  }

  let toolResponse;
  if (payload) {
    toolResponse = await Wreck.post(`${tool.baseUrl}/${request.params.path}?${queryString}`, {
      payload: payload
    });
  } else {
    toolResponse = await Wreck.get(`${tool.baseUrl}/${request.params.path}?${queryString}`);
  }

  // prepare the response to add more headers
  const response = h.response(toolResponse.payload);

  // set all the headers from the tool response
  for (let header in toolResponse.res.headers) {
    response.header(header, toolResponse.res.headers[header]);
  }

  // add Cache-Control directives from config if we do not have no-cache set in the tool response
  const responseCacheControl = Wreck.parseCacheControl(toolResponse.res.headers['cache-control']);
  if (responseCacheControl['no-cache'] !== true) {
    const configCacheControl = await request.server.methods.getCacheControlDirectivesFromConfig(options.get('/cache/cacheControl'));
    const defaultCacheControl = Wreck.parseCacheControl(configCacheControl.join(', '));

    for (directive of Object.keys(defaultCacheControl)) {
      // only add the default cache control if the directive is not present on the response from the tool
      if (!responseCacheControl.hasOwnProperty(directive)) {
        response.header('cache-control', `${directive}=${defaultCacheControl[directive]}`, {
          append: true
        });
      }
    }
  }

  return response;
}

module.exports = {
  getGetRoute: function(options) {
    return {
      path: '/tools/{tool}/{path*}',
      method: 'GET',
      options: {
        description: 'Proxies the request to the renderer service for the given tool as defined in the environment',
        tags: ['api', 'reader-facing'],
        validate: {
          params: {
            tool: Joi.string().required(),
            path: Joi.string().required()
          }
        }
      },
      handler: async (request, h) => {
        return await Reflect.apply(handler, this, [options, request, h]);
      }
    };
  },
  getPostRoute: function(options) {
    return {
      path: '/tools/{tool}/{path*}',
      method: 'POST',
      options: {
        description: 'Proxies the request to the renderer service for the given tool as defined in the environment',
        tags: ['api', 'reader-facing'],
        validate: {
          params: {
            tool: Joi.string().required(),
            path: Joi.string().required()
          },
          payload: Joi.object()
        }
      },
      handler:  async (request, h) => {
        return await Reflect.apply(handler, this, [options, request, h, request.payload]);
      }
    }
  }
}
