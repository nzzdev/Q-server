
module.exports = {
  path: '/editor/config',
  method: 'GET',
  handler: (request, reply) => {
    const editorConfig = request.server.settings.app.editorConfig.get('');
    reply(editorConfig);
  },
  config: {
    description: 'Returns configuration for Q Editor',
    tags: ['api']
  }
}
