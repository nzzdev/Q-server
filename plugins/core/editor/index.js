const Hoek = require("hoek");

const routes = [
  require("./routes/targets"),
  require("./routes/tools"),
  require("./routes/locales")
];

const defaults = {
  editorConfig: {}
};

module.exports = {
  name: "q-editor-api",
  register: async function(server, options) {
    const settings = Hoek.applyToDefaults(defaults, options);
    server.settings.app.editorConfig = settings.editorConfig;
    server.route(routes);

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
