const Boom = require("boom");
const Joi = require("joi");

module.exports = {
  path: "/search",
  method: "GET",
  options: {
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
