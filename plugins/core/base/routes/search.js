const Boom = require("boom");
const Joi = require("joi");

module.exports = {
  path: "/search",
  method: "GET",
  options: {
    validate: {
      query: {
        limit: Joi.number().optional(),
        bookmark: Joi.string().optional(),
        tool: Joi.alternatives()
          .try(Joi.array().items(Joi.string()), Joi.string())
          .optional(),
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
    return request.server.methods.db.item.search(request.query);
  }
};
