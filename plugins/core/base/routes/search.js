const Joi = require("../../../../helper/custom-joi.js");

module.exports = {
  path: "/search",
  method: "GET",
  options: {
    auth: {
      strategies: ["q-auth-azure", "q-auth-ld"],
      mode: "try",
    },
    cors: {
      credentials: true,
    },
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
        searchString: Joi.string().optional(),
      },
    },
    tags: ["api", "editor"],
  },
  handler: async (request, h) => {
    // Creates new object filterProperties which contains all properties but bookmark and limit
    const { bookmark, limit, ...filterProperties } = request.query;
    return request.server.methods.db.item.search({
      filterProperties,
      limit,
      bookmark,
      session: {
        credentials: request.auth.credentials,
        artifacts: request.auth.artifacts,
      },
    });
  },
};
