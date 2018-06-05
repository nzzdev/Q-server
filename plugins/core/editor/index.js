const Hoek = require("hoek");

const defaults = {
  editorConfig: {}
};

module.exports = {
  name: "q-editor-api",
  register: async function(server, options) {
    const settings = Hoek.applyToDefaults(defaults, options);
    server.route([
      require("./routes/targets"),
      require("./routes/tools"),
      require("./routes/locales").getGetToolsRoute(),
      require("./routes/locales").getGetEditorConfigRoute(settings)
    ]);

    server.route({
      path: "/editor/config",
      method: "GET",
      options: {
        description: "Returns configuration for Q Editor",
        tags: ["api", "editor"]
      },
      handler: (request, h) => {
        return settings.editorConfig;
      }
    });
  }
};
