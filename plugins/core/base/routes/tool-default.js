const Joi = require("joi");

module.exports = {
  getGetRoute: function (options) {
    return {
      path: "/tools/{tool}/{path*}",
      method: "GET",
      options: {
        description:
          "Proxies the request to the renderer service for the given tool as defined in the environment",
        tags: ["api", "reader-facing"],
        validate: {
          params: {
            tool: Joi.string().required(),
            path: Joi.string().required()
          },
          query: {
            appendItemToPayload: Joi.string().optional()
          },
          options: {
            allowUnknown: true
          }
        }
      },
      handler: async (request, h) => {
        return await Reflect.apply(request.server.methods.getToolResponse, this, [
          options,
          request,
          h
        ]);
      }
    };
  },
  getPostRoute: function (options) {
    return {
      path: "/tools/{tool}/{path*}",
      method: "POST",
      options: {
        description:
          "Proxies the request to the renderer service for the given tool as defined in the environment",
        tags: ["api", "reader-facing"],
        validate: {
          params: {
            tool: Joi.string().required(),
            path: Joi.string().required()
          },
          query: {
            appendItemToPayload: Joi.string().optional()
          },
          payload: Joi.object(),
          options: {
            allowUnknown: true
          }
        }
      },
      handler: async (request, h) => {
        return await Reflect.apply(request.server.methods.getToolResponse, this, [
          options,
          request,
          h
        ]);
      }
    };
  }
};
