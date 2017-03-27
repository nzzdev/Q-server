const Boom = require('boom');
const Joi = require('joi');

const renderingInfoFetcher = require('../processing/rendering-info-fetcher');
const getDb = require('../db.js').getDb;

const server = require('../server').getServer();


// size, width and height are optional 
// if a width or height array is defined the following restrictions apply:
// the array consists of either one (equality or one-sided limitation) or two objects (for a range)
// the respective object has to have a value and a comparison sign, 
// if no unit is defined the default value 'px' is assumed. 
const sizeValidationObject = { 
  width: Joi.array().items(Joi.object({
    value: Joi.number().required(),
    comparison: Joi.string().regex(/^(<|>|=){1}$/).required(),
    unit: Joi.string().regex(/^(px|mm)?$/).optional()
  }).required()).max(2).optional(), 
  height: Joi.array().items(Joi.object({
    value: Joi.number().required(),
    comparisonSign: Joi.string().optional(),
    unit: Joi.string().optional()
  })).max(2).optional() 
};

function getToolRuntimeConfig(item) {
  let toolRuntimeConfig = server.settings.app.misc.get('/toolRuntimeConfig');
  toolRuntimeConfig.toolBaseUrl = server.settings.app.misc.get('/qServerBaseUrl') + `/tools/${item.tool}`;

  return toolRuntimeConfig;
}

function validateDimension(dimension) {
  let error = "";
  if (dimension.length === 2) {
    let dimensionA = dimension[0];
    let dimensionB = dimension[1];
    if (dimensionA.unit === undefined) {
      dimensionA.unit = 'px';
    }
    if (dimensionB.unit === undefined) {
      dimensionB.unit = 'px'
    }
    if (dimensionA.unit !== dimensionB.unit) {
      error = Boom.badData('Units are not the same for the given range.');
    }
    let comparisonA = dimensionA.comparison;
    let comparisonB = dimensionB.comparison;
    if (comparisonA === comparisonB || comparisonA === '=' || comparisonB === '=' 
        || (comparisonA === '<' && dimensionA.value < dimensionB.value)
        || (comparisonB === '>' && dimensionB.value > dimensionA.value)) {
      error = Boom.badData('The combination of values and comparison signs does not result in a meaningful range.')
    }
  }
  return error;
}

// wrap getRenderingInfo as a server method to cache the response within Q-server
// as we do not want to load the tool services with caching logic.
const getRenderingInfoForId = function(id, target, toolRuntimeConfig, next) {
  const itemDbBaseUrl = server.settings.app.misc.get('/itemDbBaseUrl');
  let db = getDb();
  db.get(id, (err, item) => {
    if (err) {
      return next(Boom.create(err.statusCode, err.description))
    }

    // transform legacy tool name with dashes to underscore
    // we need to do this as the configuration framework 'confidence' we use
    // has some problems with key names containing dashes
    item.tool = item.tool.replace(new RegExp('-', 'g'), '_');

    toolRuntimeConfig = Object.assign(toolRuntimeConfig, getToolRuntimeConfig(item));
    renderingInfoFetcher.getRenderingInfo(item, target, toolRuntimeConfig)
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
  })    
}

server.method('getRenderingInfoForId', getRenderingInfoForId, {
  cache: {
    expiresIn: server.settings.app.misc.get('/cache/serverCacheTime'),
    generateTimeout: 10000
  },
  generateKey: (id, target, toolRuntimeConfig) => {
    let toolRuntimeConfigKey = JSON
      .stringify(toolRuntimeConfig)
      .replace(new RegExp('{', 'g'), '')
      .replace(new RegExp('}', 'g'), '')
      .replace(new RegExp('"', 'g'), '')
      .replace(new RegExp(':', 'g'), '-');
    let key = `${id}-${target}-${toolRuntimeConfigKey}`;
    return key;
  }
});

const getRenderingInfoRoute = {
  method: 'GET',
  path: '/rendering-info/{id}/{target}',
  config: {
    validate: {
      params: {
        id: Joi.string().required(),
        target: Joi.string().required()
      },
      query: {
        toolRuntimeConfig: Joi.object({
          size: Joi.object(sizeValidationObject).optional() 
        })
      },
      options: {
        allowUnknown: true
      }
    },
    cache: {
      expiresIn: server.settings.app.misc.get('/cache/cacheControl/maxAge') * 1000,
      privacy: 'public'
    },
    description: 'Returns rendering information for the given graphic id and target (as configured in the environment).',
    tags: ['api']
  },
  handler: function(request, reply) {
    let toolRuntimeConfig = {};
    if (request.query.toolRuntimeConfig) {
      toolRuntimeConfig = request.query.toolRuntimeConfig;

      if (toolRuntimeConfig.size) {
        if (toolRuntimeConfig.size.width) {
          let error = validateDimension(toolRuntimeConfig.size.width);
          if (error.isBoom) {
            return reply(error);
          }
        }
        if (toolRuntimeConfig.size.height) {
          let error = validateDimension(toolRuntimeConfig.size.height);
          if (error.isBoom) {
            return reply(error);
          }
        }
      }
    }

    request.server.methods.getRenderingInfoForId(request.params.id, request.params.target, toolRuntimeConfig, (err, result) => {
      if (err) {
        return reply(err);
      }
      reply(result);
    })
  }
}

const postRenderingInfoRoute = {
  method: 'POST',
  path: '/rendering-info/{target}',
  config: {
    validate: {
      params: {
        target: Joi.string().required()
      },
      payload: {
        item: Joi.object().required(),
        toolRuntimeConfig: Joi.object({
          size: Joi.object(sizeValidationObject).optional() 
        })
      },
      options: {
        allowUnknown: true
      }
    },
    description: 'Returns rendering information for the given data and target (as configured in the environment).',
    tags: ['api']
  },
  handler: function(request, reply) {
    let toolRuntimeConfig = {};
    if (request.payload.hasOwnProperty('toolRuntimeConfig')) {
      toolRuntimeConfig = request.payload.toolRuntimeConfig;

      if (toolRuntimeConfig.size) {
        if (toolRuntimeConfig.size.width) {
          let error = validateDimension(toolRuntimeConfig.size.width);
          if (error.isBoom) {
            return reply(error);
          }
        }
        if (toolRuntimeConfig.size.height) {
          let error = validateDimension(toolRuntimeConfig.size.height);
          if (error.isBoom) {
            return reply(error);
          }
        }
      }
    }

    toolRuntimeConfig = Object.assign(toolRuntimeConfig, getToolRuntimeConfig(request.payload.item));

    renderingInfoFetcher.getRenderingInfo(request.payload.item, request.params.target, toolRuntimeConfig)
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
  }
}

module.exports = {
  getRenderingInfoRoute: getRenderingInfoRoute,
  postRenderingInfoRoute: postRenderingInfoRoute
};
