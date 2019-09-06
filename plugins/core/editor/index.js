const Hoek = require("@hapi/hoek");

const configSchemas = require("./configSchemas.js");

const defaults = {
  editorConfig: {}
};

module.exports = {
  name: "q-editor-api",
  register: async function(server, options) {
    const settings = Hoek.applyToDefaults(defaults, options);

    //validate the server settings
    const targetConfigValidationResult = configSchemas.target.validate(
      server.settings.app.targets.get(`/`),
      {
        allowUnknown: true
      }
    );
    if (targetConfigValidationResult.error !== null) {
      throw new Error(targetConfigValidationResult.error);
    }

    server.route([
      require("./routes/targets"),
      require("./routes/tools"),
      require("./routes/tools-ordered-by-user-usage"),
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
