
module.exports = {
  path: '/editor/targets',
  method: 'GET',
  config: {
    description: 'Returns all configured targets',
    tags: ['api']
  },
  handler: (request, reply) => {
    const targets = request.server.settings.app.targets.get('');
    reply(targets);
  }
}
