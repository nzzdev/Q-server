
module.exports = {
  path: '/editor/targets',
  method: 'GET',
  handler: (request, reply) => {
    const targets = request.server.settings.app.targets.get('');
    reply(targets);
  },
  config: {
    description: 'Returns all configured targets',
    tags: ['api']
  }
}
