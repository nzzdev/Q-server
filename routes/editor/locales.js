const Joi = require('joi');

module.exports = {
  path: '/editor/locales/{lng}/translation.json',
  method: 'GET',
  handler: (request, reply) => {
    const tools = request.server.settings.app.tools.get('');

    // compute a translation.json file for use by i18next for the given language
    // containing the tool name and it's localized label.
    let translations = {};
    for (let toolName in tools) {
      const tool = tools[toolName];
      if (!tool.editor.hasOwnProperty('label_locales') || !tool.editor.label_locales.hasOwnProperty(request.params.lng)) {
        continue;
      }
      translations[toolName] = tool.editor.label_locales[request.params.lng];
    }

    reply(translations);
  },
  config: {
    description: 'Returns translations for given language',
    tags: ['api'],
    validate: {
      params: {
        lng: Joi.string().required()
      }
    }
  }
}
