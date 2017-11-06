const Joi = require('joi');
const Boom = require('boom');
const Wreck = require('wreck');
const querystring = require('querystring');

async function handler(request, h) {
  const tool = request.server.settings.app.tools.get(`/${request.params.tool}`);

  if (!tool) {
    return Boom.notFound(`Tool ${request.params.tool} is not known`);
  }

  let queryString = '';
  if (request.query) {
    queryString = querystring.stringify(request.query);
  }

  const toolResponse = await Wreck.get(`${tool.baseUrl}/${request.params.path}?${queryString}`);

  // prepare the response to add more headers
  const response = h.response(toolResponse.payload);

  // set all the headers from the tool response
  for (let header in toolResponse.res.headers) {
    response.header(header, toolResponse.res.headers[header]);
  }

  // apply defaults by not overriding the headers present from the tool response
  const configCacheControl = await request.server.methods.getCacheControlDirectivesFromConfig();
  const defaultCacheControl = Wreck.parseCacheControl(configCacheControl.join(', '));

  const addHeaderOptions = {
    append: true,
  };

  response.header('cache-control', `stale-if-error=${defaultCacheControl['stale-if-error']}`, addHeaderOptions);

  // the CDN should only get specific caching instructions if we do not have no-cache set in the tool response
  if (Wreck.parseCacheControl(toolResponse.res.headers['cache-control'])['no-cache'] !== true) {
    response.header('cache-control', `s-maxage=${defaultCacheControl['s-maxage']}`, addHeaderOptions);
    response.header('cache-control', `stale-while-revalidate=${defaultCacheControl['stale-while-revalidate']}`, addHeaderOptions);
  }

  return response;
}

module.exports = {
  get: {
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
    handler: handler
  },
  post: {
    path: '/tools/{tool}/{path*}',
    method: 'POST',
    options: {
      description: 'Proxies the request to the renderer service for the given tool as defined in the environment',
      tags: ['api', 'reader-facing'],
      validate: {
        params: {
          tool: Joi.string().required(),
          path: Joi.string().required()
        }
      },
      payload: {
        output: 'stream',
        parse: false
      }
    },
    handler: handler
  }
}
