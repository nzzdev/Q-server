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
        byMe: Joi.string().optional(),
        department: Joi.string().optional(),
        publication: Joi.string().optional(),
        active: Joi.boolean().optional(),
        searchString: Joi.string().optional()
      }
    },
    tags: ["api", "editor"]
  },
  handler: async (request, h) => {
    // Creates new object filterProperties which contains all properties but bookmark and limit
    const { bookmark, limit, ...filterProperties } = request.query;
    return request.server.methods.db.item.search(
      filterProperties,
      limit,
      bookmark
    );
  }
};
