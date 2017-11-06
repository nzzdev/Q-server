
module.exports = {
  path: '/editor/targets',
  method: 'GET',
  options: {
    description: 'Returns all configured targets',
    tags: ['api', 'editor']
  },
  handler: (request, h) => {
    return request.server.settings.app.targets.get('');
  }
}
