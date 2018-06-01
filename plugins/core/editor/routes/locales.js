const Joi = require("joi");

module.exports = {
  getGetRoute: function(options) {
    return {
      path: "/editor/locales/{lng}/translation.json",
      method: "GET",
      options: {
        description: "Returns translations for given language",
        tags: ["api", "editor", "non-critical"],
        validate: {
          params: {
            lng: Joi.string().required()
          }
        }
      },
      handler: (request, h) => {
        const tools = request.server.settings.app.tools.get("");

        // compute a translation.json file for use by i18next for the given language
        // containing the tool name and it's localized label.
        let translations = {};
        for (let toolName in tools) {
          const tool = tools[toolName];
          if (
            !tool.editor.hasOwnProperty("label_locales") ||
            !tool.editor.label_locales.hasOwnProperty(request.params.lng)
          ) {
            continue;
          }
          translations[toolName] =
            tool.editor.label_locales[request.params.lng];
        }

        const previewSizes = options.editorConfig.previewSizes;
        if (previewSizes) {
          translations.preview = {};
          for (let previewSizeName in previewSizes) {
            const previewSize = previewSizes[previewSizeName];
            if (
              previewSize.hasOwnProperty("label_locales") &&
              previewSize.label_locales.hasOwnProperty(request.params.lng)
            ) {
              translations.preview[previewSizeName] =
                previewSize.label_locales[request.params.lng];
            }
          }
        }

        return translations;
      }
    };
  }
};
