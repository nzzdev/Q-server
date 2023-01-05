const Boom = require("@hapi/boom");
const Joi = require("../../../helper/custom-joi.js");
const Hoek = require("@hapi/hoek");

const querystring = require("querystring");
const clone = require("clone");

const crypto = require("crypto");

const helpers = require("./helpers.js");
const sizeValidationObject = require("./size-helpers.js").sizeValidationObject;
const validateSize = require("./size-helpers.js").validateSize;
const deleteMetaProperties =
  require("../../../helper/meta-properties").deleteMetaProperties;

const configSchemas = require("./configSchemas.js");

function getGetRenderingInfoRoute(config) {
  return {
    method: "GET",
    path: "/rendering-info/{id}/{target}",
    options: {
      validate: {
        params: {
          id: Joi.string().required(),
          target: Joi.string().required(),
        },
        query: {
          toolRuntimeConfig: Joi.object({
            fileRequestBaseUrl: Joi.any().forbidden("Key 'fileRequestBaseUrl' is not allowed."),
            toolBaseUrl: Joi.any().forbidden("Key 'toolBaseUrl' is not allowed."),
            size: Joi.object(sizeValidationObject).optional(),
          }),
          ignoreInactive: Joi.boolean().optional(),
          noCache: Joi.boolean().optional(),
        },
        options: {
          allowUnknown: true,
        },
      },
      description:
        "Returns rendering information for the given graphic id and target (as configured in the environment).",
      tags: ["api", "reader-facing"],
    },
    handler: async function (request, h) {
      // This does not cancel the whole request chain, which is painful without Node 15+, but should be done during refactoring.
      // See the following answer: https://stackoverflow.com/a/37642079
      request.raw.req.on("aborted", () => {
        return h.response().code(499);
      });

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

      request.app.requestId = crypto
        .createHash("sha1")
        .update(request.info.id)
        .digest("hex");
      requestToolRuntimeConfig.requestId = request.app.requestId;

      try {
        const renderingInfo =
          await request.server.methods.renderingInfo.getRenderingInfoForId(
            request.params.id,
            request.params.target,
            requestToolRuntimeConfig,
            request.query.ignoreInactive,
            {
              credentials: request.auth.credentials,
              artifacts: request.auth.artifacts,
            }
          );

        const response = h.response(renderingInfo.payload);
        if (renderingInfo.headers.hasOwnProperty("content-type")) {
          response.header(
            "content-type",
            renderingInfo.headers["content-type"]
          );
        }

        response.header(
          "cache-control",
          request.query.noCache === true
            ? "no-cache"
            : config.cacheControlHeader
        );

        return response;
      } catch (err) {
        if (err.stack) {
          request.server.log(["error"], err.stack);
        }
        if (err.isBoom) {
          return err;
        } else {
          request.server.log(["error"], err.message);
        }
      }
    },
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
          target: Joi.string().required(),
        },
        payload: {
          item: Joi.object().required(),
          toolRuntimeConfig: Joi.object({
            fileRequestBaseUrl: Joi.any().forbidden("Key 'fileRequestBaseUrl' is not allowed."),
            toolBaseUrl: Joi.any().forbidden("Key 'toolBaseUrl' is not allowed."),
            size: Joi.object(sizeValidationObject).optional(),
          }),
        },
        options: {
          allowUnknown: true,
        },
      },
      description:
        "Returns rendering information for the given data and target (as configured in the environment).",
      tags: ["api", "editor"],
    },
    handler: async function (request, h) {
      // This does not cancel the whole request chain, which is painful without Node 15+, but should be done during refactoring.
      // See the following answer: https://stackoverflow.com/a/37642079
      request.raw.req.on("aborted", () => {
        return h.response().code(499);
      });

      let requestToolRuntimeConfig = {};

      if (request.query.toolRuntimeConfig) {
        requestToolRuntimeConfig = request.query.toolRuntimeConfig;
      } else if (request.payload.toolRuntimeConfig) {
        requestToolRuntimeConfig = request.payload.toolRuntimeConfig;
      }

      if (requestToolRuntimeConfig && requestToolRuntimeConfig.size) {
        try {
          validateSize(requestToolRuntimeConfig.size);
        } catch (err) {
          if (err.isBoom) {
            throw err;
          } else {
            throw Boom.internal(err);
          }
        }
      }

      request.app.requestId = crypto
        .createHash("sha1")
        .update(request.info.id)
        .digest("hex");
      requestToolRuntimeConfig.requestId = request.app.requestId;

      // this property is passed through to the tool in the end to let it know if the item state is available in the database or not
      const itemStateInDb = false;
      try {
        const renderingInfo =
          await request.server.methods.renderingInfo.getRenderingInfoForItem({
            item: request.payload.item,
            target: request.params.target,
            requestToolRuntimeConfig,
            ignoreInactive: request.query.ignoreInactive,
            itemStateInDb,
          });

        const response = h.response(renderingInfo.payload);
        if (renderingInfo.headers.hasOwnProperty("content-type")) {
          response.header(
            "content-type",
            renderingInfo.headers["content-type"]
          );
        }

        response.header(
          "cache-control",
          request.query.noCache === true
            ? "no-cache"
            : config.cacheControlHeader
        );

        return response;
      } catch (err) {
        request.server.log(["error"], err);
        if (err.isBoom) {
          return err;
        } else {
          return Boom.serverUnavailable(err.message);
        }
      }
    },
  };
}

module.exports = {
  name: "q-rendering-info",
  dependencies: "q-base",
  register: async function (server, options) {
    Hoek.assert(
      server.settings.app.tools &&
        typeof server.settings.app.tools.get === "function",
      new Error("server.settings.app.tools.get needs to be a function")
    );

    // validate the target config used by this plugin
    const targetConfigValidationResult = configSchemas.target.validate(
      server.settings.app.targets.get(`/`),
      {
        allowUnknown: true,
      }
    );
    if (targetConfigValidationResult.error) {
      throw new Error(targetConfigValidationResult.error);
    }

    // validate the tool endpoint config for all the defined targets
    Object.keys(server.settings.app.tools.get(`/`)).forEach((tool) => {
      Object.keys(server.settings.app.targets.get(`/`)).forEach((target) => {
        const endpointConfig = server.settings.app.tools.get(
          `/${tool}/endpoint`,
          { target }
        );
        const toolEndpointConfigValidationResult =
          configSchemas.toolEndpoint.validate(endpointConfig, {
            allowUnknown: true,
          });
        if (toolEndpointConfigValidationResult.error) {
          throw new Error(
            `failed to validate toolEndpoint config: ${JSON.stringify(
              endpointConfig
            )}. Joi error: ${toolEndpointConfigValidationResult.error}`
          );
        }
      });
    });

    server.method(
      "renderingInfo.getRenderingInfoForItem",
      async ({ item, target, requestToolRuntimeConfig, itemStateInDb }) => {
        // the target needs to be defined, otherwise we fail here
        const targetConfig = server.settings.app.targets.get(`/${target}`);
        if (!targetConfig) {
          throw new Error(`${target} not configured`);
        }

        const endpointConfig = server.settings.app.tools.get(
          `/${item.tool}/endpoint`,
          { target: target }
        );

        if (!endpointConfig) {
          throw new Error(
            `no endpoint configured for tool: ${item.tool} and target: ${target}`
          );
        }

        let toolEndpointConfig;
        if (endpointConfig instanceof Function) {
          toolEndpointConfig = await endpointConfig.apply(this, [
            item,
            requestToolRuntimeConfig,
          ]);
        } else {
          toolEndpointConfig = endpointConfig;
        }

        // compile the toolRuntimeConfig from runtimeConfig from server, tool endpoint and request
        const toolRuntimeConfig = helpers.getCompiledToolRuntimeConfig(item, {
          serverWideToolRuntimeConfig: options.get("/toolRuntimeConfig", {
            target: target,
            tool: item.tool,
          }),
          targetToolRuntimeConfig: server.settings.app.targets.get(
            `/${target}/toolRuntimeConfig`
          ),
          toolEndpointConfig: toolEndpointConfig,
          requestToolRuntimeConfig: requestToolRuntimeConfig,
        });

        const baseUrl = server.settings.app.tools.get(`/${item.tool}/baseUrl`, {
          target: target,
        });

        const requestUrl = helpers.getRequestUrlFromEndpointConfig(
          toolEndpointConfig,
          baseUrl
        );

        // add _id, createdDate and updatedDate as query params to rendering info request
        // todo: the tool could provide the needed query parameters in the config in a future version
        let queryParams = ["_id", "createdDate", "updatedDate"];
        let query = {};
        for (let queryParam of queryParams) {
          if (item.hasOwnProperty(queryParam) && item[queryParam]) {
            query[queryParam] = item[queryParam];
          }
        }
        let queryString = querystring.stringify(query);

        // strip the meta properties before sending the item to the tool service
        // and keepMeta is not true in target and endpoint config
        let keepMeta = false;
        if (targetConfig.keepMeta === true) {
          keepMeta = true;
        }
        if (endpointConfig.keepMeta === true) {
          keepMeta = true;
        } else if (endpointConfig.keepMeta === false) {
          keepMeta = false;
        }
        const requestPayload = {
          item: keepMeta ? item : deleteMetaProperties(clone(item)),
          itemStateInDb: itemStateInDb,
          toolRuntimeConfig: toolRuntimeConfig,
        };

        const { res, payload } = await server.app.wreck.post(
          `${requestUrl}?${queryString}`,
          {
            payload: requestPayload,
          }
        );

        const contentType = res.headers["content-type"];

        // first validate the response content-type against the target type to see if the response is valid
        if (!helpers.isValidContentTypeForTarget(targetConfig, contentType)) {
          throw new Error(
            `no valid response received from endpoint for target ${targetConfig.label}`
          );
        }

        let renderingInfo;

        // only application/json and target config type web can be compiled with additional renderingInfo
        // all the other cases get returned here
        if (helpers.canGetCompiled(targetConfig, contentType)) {
          renderingInfo = await helpers.getCompiledRenderingInfo({
            renderingInfo: JSON.parse(payload.toString("utf-8")),
            endpointConfig: toolEndpointConfig,
            targetConfig,
            item,
            toolRuntimeConfig,
          });
        } else {
          renderingInfo = payload;
        }

        renderingInfo =
          await server.methods.renderingInfo.getProcessedRenderingInfo({
            item,
            targetConfig,
            endpointConfig,
            toolRuntimeConfig,
            renderingInfo,
          });

        return {
          payload: renderingInfo,
          headers: res.headers,
        };
      }
    );

    server.method(
      "renderingInfo.getRenderingInfoForId",
      async (id, target, requestToolRuntimeConfig, ignoreInactive, session) => {
        try {
          const item = await server.methods.db.item.getById({
            id,
            ignoreInactive,
            session,
          });
          // this property is passed through to the tool in the end to let it know if the item state is available in the database or not
          const itemStateInDb = true;
          return server.methods.renderingInfo.getRenderingInfoForItem({
            item,
            target,
            requestToolRuntimeConfig,
            itemStateInDb,
          });
        } catch (err) {
          throw err;
        }
      }
    );

    server.method(
      "renderingInfo.getProcessedRenderingInfo",
      async ({
        item,
        targetConfig,
        endpointConfig,
        toolRuntimeConfig,
        renderingInfo,
        session,
      }) => {
        const processFunctions = [];
        if (Array.isArray(targetConfig.processRenderingInfo)) {
          processFunctions.push(...targetConfig.processRenderingInfo);
        } else if (targetConfig.processRenderingInfo instanceof Function) {
          processFunctions.push(targetConfig.processRenderingInfo);
        }
        if (Array.isArray(endpointConfig.processRenderingInfo)) {
          processFunctions.push(...endpointConfig.processRenderingInfo);
        } else if (endpointConfig.processRenderingInfo instanceof Function) {
          processFunctions.push(endpointConfig.processRenderingInfo);
        }

        for (const func of processFunctions) {
          renderingInfo = await func.apply(this, [
            { item, toolRuntimeConfig, renderingInfo, session },
          ]);
        }

        return renderingInfo;
      }
    );

    // calculate the cache control header from options given
    const cacheControlDirectives =
      await server.methods.getCacheControlDirectivesFromConfig(
        options.get("/cache/cacheControl")
      );
    const cacheControlHeader = cacheControlDirectives.join(", ");

    const routesConfig = {
      cacheControlHeader: cacheControlHeader,
    };

    server.route([
      getGetRenderingInfoRoute(routesConfig),
      getPostRenderingInfoRoute(routesConfig),
    ]);
  },
};
