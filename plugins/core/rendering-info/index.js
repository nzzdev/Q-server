const Boom = require("boom");
const Joi = require("joi");
const Hoek = require("hoek");

const getRenderingInfo = require("./helpers.js").getRenderingInfo;
const getCompiledToolRuntimeConfig = require("./helpers.js")
  .getCompiledToolRuntimeConfig;
const sizeValidationObject = require("./size-helpers.js").sizeValidationObject;
const validateSize = require("./size-helpers.js").validateSize;

function getGetRenderingInfoRoute(config) {
  return {
    method: "GET",
    path: "/rendering-info/{id}/{target}",
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
          ignoreInactive: Joi.boolean().optional(),
          noCache: Joi.boolean().optional()
        },
        options: {
          allowUnknown: true
        }
      },
      description:
        "Returns rendering information for the given graphic id and target (as configured in the environment).",
      tags: ["api", "reader-facing"]
    },
    handler: async function(request, h) {
      let requestToolRuntimeConfig = {};

      if (request.query.toolRuntimeConfig) {
        if (request.query.toolRuntimeConfig.size) {
          try {
            validateSize(request.query.toolRuntimeConfig.size);
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
        const renderingInfo = await request.server.methods.renderingInfo.getRenderingInfoForId(
          request.params.id,
          request.params.target,
          requestToolRuntimeConfig,
          request.query.ignoreInactive
        );
        return h
          .response(renderingInfo)
          .header(
            "cache-control",
            request.query.noCache === true
              ? "no-cache"
              : config.cacheControlHeader
          );
      } catch (err) {
        if (err.stack) {
          request.server.log(["error"], err.stack);
        }
        if (err.isBoom) {
          return err;
        } else {
          return Boom.serverUnavailable(err.message);
        }
      }
    }
  };
}

function getPostRenderingInfoRoute(config) {
  return {
    method: "POST",
    path: "/rendering-info/{target}",
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
        }
      },
      description:
        "Returns rendering information for the given data and target (as configured in the environment).",
      tags: ["api", "editor"]
    },
    handler: async function(request, h) {
      let requestToolRuntimeConfig = {};

      if (request.query.toolRuntimeConfig) {
        if (request.query.toolRuntimeConfig.size) {
          try {
            validateSize(request.query.toolRuntimeConfig.size);
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

      // this property is passed through to the tool in the end to let it know if the item state is available in the database or not
      const itemStateInDb = false;

      try {
        return await request.server.methods.renderingInfo.getRenderingInfoForItem(
          request.payload.item,
          request.params.target,
          requestToolRuntimeConfig,
          request.query.ignoreInactive,
          itemStateInDb
        );
      } catch (err) {
        if (err.isBoom) {
          return err;
        } else {
          return Boom.serverUnavailable(err.message);
        }
      }
    }
  };
}

module.exports = {
  name: "q-rendering-info",
  dependencies: "q-base",
  register: async function(server, options) {
    Hoek.assert(
      server.settings.app.tools &&
        typeof server.settings.app.tools.get === "function",
      new Error("server.settings.app.tools.get needs to be a function")
    );

    server.method(
      "renderingInfo.getRenderingInfoForItem",
      async (
        item,
        target,
        requestToolRuntimeConfig,
        ignoreInactive,
        itemStateInDb
      ) => {
        const endpointConfig = server.settings.app.tools.get(
          `/${item.tool}/endpoint`,
          { target: target }
        );

        if (!endpointConfig) {
          throw new Error(
            `no endpoint configured for tool: ${
              item.tool
            } and target: ${target}`
          );
        }

        let toolEndpointConfig;

        if (endpointConfig instanceof Function) {
          toolEndpointConfig = await endpointConfig.apply(this, [
            item,
            requestToolRuntimeConfig
          ]);
        } else {
          toolEndpointConfig = endpointConfig;
        }

        // compile the toolRuntimeConfig from runtimeConfig from server, tool endpoint and request
        const toolRuntimeConfig = getCompiledToolRuntimeConfig(item, {
          serverWideToolRuntimeConfig: options.get("/toolRuntimeConfig", {
            target: target,
            tool: item.tool
          }),
          toolEndpointConfig: toolEndpointConfig,
          requestToolRuntimeConfig: requestToolRuntimeConfig
        });

        const baseUrl = server.settings.app.tools.get(`/${item.tool}/baseUrl`, {
          target: target
        });

        return await getRenderingInfo(
          item,
          baseUrl,
          toolEndpointConfig,
          toolRuntimeConfig,
          itemStateInDb
        );
      }
    );

    server.method(
      "renderingInfo.getRenderingInfoForId",
      async (id, target, requestToolRuntimeConfig, ignoreInactive) => {
        const item = await server.methods.db.item.getById(id, ignoreInactive);
        // this property is passed through to the tool in the end to let it know if the item state is available in the database or not
        const itemStateInDb = true;
        return server.methods.renderingInfo.getRenderingInfoForItem(
          item,
          target,
          requestToolRuntimeConfig,
          ignoreInactive,
          itemStateInDb
        );
      }
    );

    // calculate the cache control header from options given
    const cacheControlDirectives = await server.methods.getCacheControlDirectivesFromConfig(
      options.get("/cache/cacheControl")
    );
    const cacheControlHeader = cacheControlDirectives.join(", ");

    const routesConfig = {
      cacheControlHeader: cacheControlHeader
    };

    server.route([
      getGetRenderingInfoRoute(routesConfig),
      getPostRenderingInfoRoute(routesConfig)
    ]);
  }
};
