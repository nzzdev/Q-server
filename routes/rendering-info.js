const renderingInfoFetcher = require('../processing/rendering-info-fetcher');
const Boom = require('boom');
const Joi = require('joi');
const server = require('../server').getServer();

const getRenderingInfoForId = function(id, target, toolRuntimeConfig, next) {
  renderingInfoFetcher.getRenderingInfoForId(id, target)
    .then(renderingInfo => {
      next(null, renderingInfo);
    })
    .catch(err => {
      if (err.isBoom) {
        next(err, null);
      } else {
        const error = Boom.badRequest(err.message);
        next(error, null);
      }
    })
}

server.method('getRenderingInfoForId', getRenderingInfoForId, {
  cache: {
    expiresIn: server.settings.app.misc.get('/cache/serverCacheTime'),
    generateTimeout: 10000
  }
});

const getRenderingInfoRoute = {
  method: 'GET',
  path: '/rendering-info/{id}/{target}',
  handler: function(request, reply) {

    // construct the runtime config for the tool service
    let toolRuntimeConfig = server.settings.app.misc.get('/toolRuntimeConfig');

    request.server.methods.getRenderingInfoForId(request.params.id, request.params.target, toolRuntimeConfig, (err, result) => {
      if (err) {
        return reply(err);
      }
      reply(result);
    })
  },
  config: {
    validate: {
      params: {
        id: Joi.string().required(),
        target: Joi.string().required()
      }
    },
    cache: {
      expiresIn: server.settings.app.misc.get('/cache/cacheControl/maxAge') * 1000,
      privacy: 'public'
    },
    description: 'Returns rendering information for the given graphic id and target (as configured in the environment).',
    tags: ['api']
  }
}

const postRenderingInfoRoute = {
  method: 'POST',
  path: '/rendering-info/{target}',
  handler: function(request, reply) {
    // construct the runtime config for the tool service
    let toolRuntimeConfig = server.settings.app.misc.get('/toolRuntimeConfig');

    renderingInfoFetcher.getRenderingInfoForData(request.payload.item, request.params.target, toolRuntimeConfig)
      .then(renderingInfo => {
        reply(renderingInfo)
      })
      .catch(error => {
        if (error.isBoom) {
          reply(error)
        } else {
          reply(Boom.badRequest(error.message))
        }
      })
  },
  config: {
    validate: {
      params: {
        target: Joi.string().required()
      },
      payload: {
        item: Joi.object().required()
      }
    },
    description: 'Returns rendering information for the given data and target (as configured in the environment).',
    tags: ['api']
  }
}

module.exports = {
  getRenderingInfoRoute: getRenderingInfoRoute,
  postRenderingInfoRoute: postRenderingInfoRoute
};
