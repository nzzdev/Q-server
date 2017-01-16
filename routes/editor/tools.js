
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
        editorToolConfigs.push(toolEditorConfig);
      })

    reply(editorToolConfigs);
  },
  config: {
    description: 'Returns all available Q tool names',
    tags: ['api']
  }
}
