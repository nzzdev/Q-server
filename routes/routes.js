const Repo = require('../database/repository');

var graphicRoute = {
  method: 'GET',
  path: '/{id}',
  config: {
      handler: function (request, reply) {
          reply(Repo.fetchItemTool(request.params.id));
      },
      description: 'Get Q-item',
      notes: 'dev',
      tags: ['api']
  }
}

module.exports = [
	graphicRoute
]