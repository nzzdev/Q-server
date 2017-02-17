const renderingInfoFetcher = require('../processing/rendering-info-fetcher');
const repository = require('../processing/repository');
const Boom = require('boom');
const Joi = require('joi');
const server = require('../server').getServer();

function getToolRuntimeConfig(item) {
  let toolRuntimeConfig = server.settings.app.misc.get('/toolRuntimeConfig');
  toolRuntimeConfig.toolBaseUrl = server.settings.app.misc.get('/qServerBaseUrl') + `/tools/${item.tool}`;

  return toolRuntimeConfig;
}

// wrap getRenderingInfo as a server method to cache the response within Q-server
// as we do not want to load the tool services with caching logic.
const getRenderingInfoForId = function(id, target, width, toolRuntimeConfig, next) {
  const itemDbBaseUrl = server.settings.app.misc.get('/itemDbBaseUrl');

  return repository.fetchQItem(id, itemDbBaseUrl)
    .then(data => {
      toolRuntimeConfig = Object.assign(toolRuntimeConfig, getToolRuntimeConfig(data));
      return renderingInfoFetcher.getRenderingInfo(data, target, width, toolRuntimeConfig);
    })
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
  },
  generateKey: (id, target, width, toolRuntimeConfig) => {
    let toolRuntimeConfigKey = JSON
      .stringify(toolRuntimeConfig)
      .replace(new RegExp('{', 'g'), '')
      .replace(new RegExp('}', 'g'), '')
      .replace(new RegExp('"', 'g'), '')
      .replace(new RegExp(':', 'g'), '-')
    let key = `${id}-${target}-${toolRuntimeConfigKey}`;
    return key;
  }
});

const getRenderingInfoRoute = {
  method: 'GET',
  path: '/rendering-info/{id}/{target}/{width?}',
  handler: function(request, reply) {
    
    let toolRuntimeConfig = {};
    if (request.query.toolRuntimeConfig) {
      toolRuntimeConfig = request.query.toolRuntimeConfig;
    }

    request.server.methods.getRenderingInfoForId(request.params.id, request.params.target, request.params.width, toolRuntimeConfig, (err, result) => {
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
        target: Joi.string().required(),
        width: Joi.number().optional()
      },
      query: {
        toolRuntimeConfig: Joi.object()
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
  path: '/rendering-info/{target}/{width?}',
  handler: function(request, reply) {
    let toolRuntimeConfig = {};
    if (request.payload.hasOwnProperty('toolRuntimeConfig')) {
      toolRuntimeConfig = request.payload.toolRuntimeConfig;
    }
    toolRuntimeConfig = Object.assign(toolRuntimeConfig, getToolRuntimeConfig(request.payload.item));

    renderingInfoFetcher.getRenderingInfo(request.payload.item, request.params.target, request.params.width, toolRuntimeConfig)
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
        target: Joi.string().required(),
        width: Joi.number().optional()
      },
      payload: {
        item: Joi.object().required(),
        toolRuntimeConfig: Joi.object()
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
