const getMarkup = require('../processing/rendering-info-fetcher');
const server = require('../server');
const parameter = require('../config/parameter');

var getRouteToQTool = function(id, target, next) {
	getMarkup(id, target)
    .then(markup => {
      next(null, markup);
    })
}

server.method('getRouteToQTool', getRouteToQTool, {
  cache: {
    cache: 'memoryCache',
    expiresIn: parameter.serverCache * 1000,
    generateTimeout: 3000
  }
});

var markupRoute = {
  method: 'GET',
  path: '/{target}/{id}',
  handler: function (request, reply) {
    server.methods.getRouteToQTool(request.params.id, request.params.target, (err, result) => {
      if (err) {
        return reply(err);
      }
      reply(result);
    })
  },
  config: {
    cache: {
      expiresIn: parameter.cacheControl * 1000, 
      privacy: 'public'
    },
    description: 'Returns rendering information for the given graphic id and target (as configured in the environment). Also dependant on the tool, which is derived from the graphic database entry.',
    notes: 'dev',
    tags: ['api']
  }
}

module.exports = markupRoute;