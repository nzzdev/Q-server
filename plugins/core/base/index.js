const Wreck = require("@hapi/wreck");
const getToolResponse = require("./methods/getToolResponse.js").getToolResponse;
const getCacheControlDirectivesFromConfig = require("./methods/getCacheControlDirectivesFromConfig.js")
  .getCacheControlDirectivesFromConfig;

module.exports = {
  name: "q-base",
  dependencies: ["q-db"],
  register: async function(server, options) {
    await server.register([require("@hapi/vision"), require("@hapi/inert")]);
    server.method("getToolResponse", getToolResponse);
    server.method(
      "getCacheControlDirectivesFromConfig",
      getCacheControlDirectivesFromConfig
    );

    server.event("item.new");
    server.event("item.update");
    server.event("item.activate");
    server.event("item.deactivate");
    server.event("item.delete");

    // provide a common wreck instance
    // this should be used throughout all the plugins in the future
    // to allow for common wreck options for all the requests (proxies for example)
    server.app.wreck = Wreck.defaults(options.wreckDefaults || {});

    await server.route([
      require("./routes/item.js").get,
      require("./routes/item.js").post,
      require("./routes/item.js").put,
      require("./routes/search.js"),
      require("./routes/tool-default.js").getGetRoute(options),
      require("./routes/tool-default.js").getPostRoute(options),
      require("./routes/tool-schema.js").getSchema(options),
      require("./routes/tool-schema.js").getDisplayOptionsSchema(options),
      require("./routes/display-options-schema.js").getGetRoute(options),
      require("./routes/health.js"),
      require("./routes/version.js"),
      require("./routes/admin/migration.js")
    ]);
  }
};
