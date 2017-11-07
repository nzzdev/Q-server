const Boom = require('boom');
const Joi = require('joi');

const getRenderingInfo = require('./helpers.js').getRenderingInfo;
const sizeValidationObject = require('./size-helpers.js').sizeValidationObject;
const validateSize = require('./size-helpers.js').validateSize;

function getCompiledToolRuntimeConfig(item, { serverWideToolRuntimeConfig, toolBaseUrlConfig, qServerBaseUrl, toolEndpointConfig, requestToolRuntimeConfig }) {
  const overallToolRuntimeConfig = serverWideToolRuntimeConfig;
  
  if (toolBaseUrlConfig && toolBaseUrlConfig.host) {
    // if we have a toolBaseUrl config object in misc, we take this to generate the toolBaseUrl
    let protocol = 'https';
    if (toolBaseUrlConfig.protocol) {
      protocol = toolBaseUrlConfig.protocol;
    }
    let path = 'tools';
    if (toolBaseUrlConfig.path) {
      path = toolBaseUrlConfig.path;
    }
    overallToolRuntimeConfig.toolBaseUrl = `${protocol}://${toolBaseUrlConfig.host}/${path}`;
  } else {
    // otherwise we fall back to using the qServerBaseUrl with hardcoded `tools` path
    overallToolRuntimeConfig.toolBaseUrl =  qServerBaseUrl + `/tools`;
  }

  // add the tools name to the toolBaseUrl
  overallToolRuntimeConfig.toolBaseUrl = `${overallToolRuntimeConfig.toolBaseUrl}/${item.tool}`;
  
  // default to the overall config
  let toolRuntimeConfig = overallToolRuntimeConfig;

  // add the item id if given or to a randomized id if not
  if (item.hasOwnProperty('_id')) {
    toolRuntimeConfig.id = item._id;
  }

  // if endpoint defines tool runtime config, apply it
  if (toolEndpointConfig && toolEndpointConfig.toolRuntimeConfig) {
    toolRuntimeConfig = Object.assign(toolRuntimeConfig, toolEndpointConfig.toolRuntimeConfig);
  }

  // apply to runtime config from the request
  toolRuntimeConfig = Object.assign(toolRuntimeConfig, requestToolRuntimeConfig);

  return toolRuntimeConfig;
}

const getRenderingInfoRoute = {
  method: 'GET',
  path: '/rendering-info/{id}/{target}',
  options: {
    validate: {
      params: {
        id: Joi.string().required(),
        target: Joi.string().required()
      },
      query: {
        toolRuntimeConfig: Joi.object({
          size: Joi.object(sizeValidationObject).optional()
        }),
        noCache: Joi.boolean().optional(),
        ignoreInactive: Joi.boolean().optional()
      },
      options: {
        allowUnknown: true
      }
    },
    description: 'Returns rendering information for the given graphic id and target (as configured in the environment).',
    tags: ['api', 'reader-facing']
  },
  handler: async function(request, h) {
    let requestToolRuntimeConfig = {};

    if (request.query.toolRuntimeConfig) {
      if (request.query.toolRuntimeConfig.size) {
        try {
          validateSize(request.query.toolRuntimeConfig.size)
        } catch (err) {
          if (err.isBoom) {
            throw err;
          } else {
            throw Boom.internal(err);
          }
        }
      }

      requestToolRuntimeConfig = request.query.toolRuntimeConfig;
    }

    try {

      const configCacheControl = await request.server.methods.getCacheControlDirectivesFromConfig();

      if (request.query.noCache) {
        const renderingInfo = await request.server.methods.renderingInfo.getRenderingInfoForId(request.params.id, request.params.target, requestToolRuntimeConfig, request.query.ignoreInactive);
        return h.response(renderingInfo)
          .header('cache-control', 'no-cache');
      } else {
        const renderingInfo = await request.server.methods.renderingInfo.cached.getRenderingInfoForId(request.params.id, request.params.target, requestToolRuntimeConfig, request.query.ignoreInactive);
        return h.response(renderingInfo)
          .header('cache-control', configCacheControl.join(', '));
      }
    } catch (err) {
      if (err.stack) {
        request.server.log(['error'], err.stack);
      }
      if (err.isBoom) {
        return err;
      } else {
        return Boom.internal(err.message);
      }
    }
  }
}

const postRenderingInfoRoute = {
  method: 'POST',
  path: '/rendering-info/{target}',
  options: {
    cache: false,
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
      },
    },
    description: 'Returns rendering information for the given data and target (as configured in the environment).',
    tags: ['api', 'editor']
  },
  handler: async function(request, h) {
    let requestToolRuntimeConfig = {};

    if (request.query.toolRuntimeConfig) {
      if (request.query.toolRuntimeConfig.size) {
        try {
          validateSize(request.query.toolRuntimeConfig.size)
        } catch (err) {
          if (err.isBoom) {
            throw err;
          } else {
            throw Boom.internal(err);
          }
        }
      }
      requestToolRuntimeConfig = request.payload.toolRuntimeConfig;
    }

    try {
      return await request.server.methods.renderingInfo.getRenderingInfoForItem(request.payload.item, request.params.target, requestToolRuntimeConfig, request.query.ignoreInactive);
    } catch (err) {
      if (err.isBoom) {
        return err;
      } else {
        return Boom.internal(err.message);
      }
    }
  }
}

module.exports = {
  name: 'q-rendering-info',
  dependencies: 'q-base',
  register: async function(server, options) {

    server.method('renderingInfo.getRenderingInfoForItem', async(item, target, requestToolRuntimeConfig, ignoreInactive) => {
      const endpointConfig = server.settings.app.tools.get(`/${item.tool}/endpoint`, { target: target })
      if (!endpointConfig) {
        throw new Error(`no endpoint configured for tool: ${item.tool} and target: ${target}`);
      }
      
      // compile the toolRuntimeConfig from runtimeConfig from server, tool endpoint and request
      const toolRuntimeConfig = getCompiledToolRuntimeConfig(item, {
        serverWideToolRuntimeConfig: server.settings.app.misc.get('/toolRuntimeConfig'),
        toolBaseUrlConfig:           server.settings.app.misc.get('/toolBaseUrl'),
        qServerBaseUrl:              server.settings.app.misc.get('/qServerBaseUrl'),
        toolEndpointConfig:          server.settings.app.tools.get(`/${item.tool}/endpoint`, { target: target }),
        requestToolRuntimeConfig:    requestToolRuntimeConfig
      });

      const baseUrl = server.settings.app.tools.get(`/${item.tool}/baseUrl`, { target: target });

      return await getRenderingInfo(item, baseUrl, endpointConfig, toolRuntimeConfig);
    });

    server.method('renderingInfo.getRenderingInfoForId', async (id, target, requestToolRuntimeConfig, ignoreInactive) => {
      const item = await server.methods.db.item.getById(id, ignoreInactive);
      return server.methods.renderingInfo.getRenderingInfoForItem(item, target, requestToolRuntimeConfig, ignoreInactive);
    });

    server.method('renderingInfo.cached.getRenderingInfoForId', async (id, target, requestToolRuntimeConfig, ignoreInactive) => {
      const item = await server.methods.db.item.getById(id, ignoreInactive);
      return server.methods.renderingInfo.getRenderingInfoForItem(item, target, requestToolRuntimeConfig, ignoreInactive);
    }, {
      cache: {
        expiresIn: server.settings.app.misc.get('/cache/serverCacheTime'),
        generateTimeout: 10000
      },
      generateKey: (id, target, toolRuntimeConfig, ignoreInactive) => {
        let toolRuntimeConfigKey = JSON
          .stringify(toolRuntimeConfig)
          .replace(new RegExp('{', 'g'), '')
          .replace(new RegExp('}', 'g'), '')
          .replace(new RegExp('"', 'g'), '')
          .replace(new RegExp(':', 'g'), '-');
        let key = `${id}-${target}-${toolRuntimeConfigKey}-${ignoreInactive}`;
        return key;
      }
    });

    server.route([
      getRenderingInfoRoute,
      postRenderingInfoRoute
    ])
  }
}
