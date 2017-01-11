const getMarkup = require('../processing/markup-fetcher');
const server = require('../server');

var getRouteToQTool = function(id, target, next) {
	let itemRenderingDetails = getMarkup(id, target);	
	return next(null, itemRenderingDetails);
}

server.method('getRouteToQTool', getRouteToQTool, {
  cache: {
    cache: 'memoryCache',
    expiresIn: 30 * 60 * 1000,
    generateTimeout: 3000
  }
});

var markupRoute = {
  method: 'GET',
  path: '/Q/{id}/{target}',
  config: {
      handler: function (request, reply) {
      	server.methods.getRouteToQTool(request.params.id, request.params.target, (err, result) => {
      		if (err) {
      			return reply(err);
      		}
      		reply(result);
      	});
      },
      description: 'Get markup and style and script description for rendering a q item',
      notes: 'dev',
      tags: ['api']
  }
}

module.exports = markupRoute;