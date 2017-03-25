
module.exports = {
  path: '/editor/tools',
  method: 'GET',
  handler: (request, reply) => {
    const tools = request.server.settings.app.tools.get('');

    let editorToolConfigs = [];
    
    Object.keys(tools)
      .forEach(toolName => {
        let toolEditorConfig = {
          name: toolName
        }
        Object.assign(toolEditorConfig, tools[toolName].editor)

        // remove label_locales, we do not need these on the client
        delete toolEditorConfig.label_locales;

        editorToolConfigs.push(toolEditorConfig);
      })

    reply(editorToolConfigs);
  },
  config: {
    description: 'Returns all available Q tool names',
    tags: ['api']
  }
}
