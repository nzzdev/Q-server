const Boom = require("boom");
const Joi = require("joi");

module.exports = {
  get: {
    path: "/search",
    method: "GET",
    options: {
      validate: {
        query: {
          limit: Joi.number().optional(),
          bookmark: Joi.string().optional(),
          tool: Joi.alternatives([Joi.string(), Joi.array()]).optional(),
          createdBy: Joi.string().optional(),
          department: Joi.string().optional(),
          publication: Joi.string().optional(),
          active: Joi.boolean().optional(),
          searchString: Joi.string().optional()
        }
      },
      tags: ["api", "editor"]
    },
    handler: async (request, h) => {
      return request.server.methods.db.item.newSearch(request.query);
    }
  },
  post: {
    path: "/search",
    method: "POST",
    options: {
      validate: {
        payload: Joi.object().required()
      },
      tags: ["api", "editor"]
    },
    handler: async (request, h) => {
      return request.server.methods.db.item.search(request.payload);
    }
  }
};
