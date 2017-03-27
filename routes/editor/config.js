
module.exports = {
  path: '/editor/config',
  method: 'GET',
  config: {
    description: 'Returns configuration for Q Editor',
    tags: ['api']
  },
  handler: (request, reply) => {
    const editorConfig = request.server.settings.app.editorConfig.get('');
    reply(editorConfig);
  }
}
