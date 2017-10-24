
module.exports = {
  path: '/editor/targets',
  method: 'GET',
  config: {
    description: 'Returns all configured targets',
    tags: ['api', 'editor']
  },
  handler: (request, reply) => {
    const targets = request.server.settings.app.targets.get('');
    for (let target of targets) {
      if (target.hasOwnProperty('preview')) {
        console.log('DEPRECATION NOTICE: target.preview config will be renamed to target.context in Q server 3.0.');
      } else {
        // just here for backwards compatibility
        if (target.hasOwnProperty('context')) {
          target.preview = target.context;
        }
      }
    }
    reply(targets);
  }
}
