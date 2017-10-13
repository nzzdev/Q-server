const Joi = require('joi');
const Boom = require('boom');
const Wreck = require('wreck');
const fetch = require('node-fetch');
const querystring = require('querystring');
const getCacheControlDirectivesFromConfig = require('../../helper/cache.js').getCacheControlDirectivesFromConfig;

function handler(request, reply) {
  const tool = request.server.settings.app.tools.get(`/${request.params.tool}`);

  if (!tool) {
    return reply(Boom.notFound(`Tool ${request.params.tool} is not known`));
  }

  let queryString = '';
  if (request.query) {
    queryString = querystring.stringify(request.query);
  }

  return reply.proxy({
    uri: `${tool.baseUrl}/${request.params.path}?${queryString}`,
    ttl: 'upstream',
    onResponse: (err, res, proxyRequest, reply, settings, ttl) => {
      if (err) {
        return reply(err);
      }

      const configCacheControl = getCacheControlDirectivesFromConfig(request.server);

      // if a tool has set a Cache Control header, we honor it but add some additional directives for the CDN
      if (res.headers['cache-control']) {

        const responseCacheControl = Wreck.parseCacheControl(res.headers['cache-control']);
        const defaultCacheControl = Wreck.parseCacheControl(configCacheControl.join(', '));

        // in any case we want the CDN to return a stale copy if it has one
        if (!responseCacheControl['stale-if-error']) {
          responseCacheControl['stale-if-error'] = defaultCacheControl['stale-if-error'];
        }

        // the CDN should only get specific caching instructions if we do not have no-cache set
        if (responseCacheControl['no-cache'] !== true) {
          // s-maxage and stale-while-revalidate headers get defaulted if not given
          if (!responseCacheControl['s-maxage']) {
            responseCacheControl['s-maxage'] = defaultCacheControl['s-maxage'];
          }
          if (!responseCacheControl['stale-while-revalidate']) {
            responseCacheControl['stale-while-revalidate'] = defaultCacheControl['stale-while-revalidate'];
          }
        }

        res.headers['cache-control'] = Object.keys(responseCacheControl)
          .map(directive => {
            if (responseCacheControl[directive] === true) {
              return `${directive}`
            }
            return `${directive}=${responseCacheControl[directive]}`;
          })
          .join(', ')

        return reply(res);
      }

      // if no Cache Control header is given from the tool we add a default one here for sanity
      // if a tool does not want a resource to be cached, it should respond with Cache-Control: no-cache
      return reply(res)
        .header('cache-control', configCacheControl.join(', '));
    }
  })
}

module.exports = {
  get: {
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
    handler: handler
  },
  post: {
    path: '/tools/{tool}/{path*}',
    method: 'POST',
    config: {
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
