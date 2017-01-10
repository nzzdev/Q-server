const getItem = require('../processing/markup-fetcher');
const server = require('../server');
const Fetch = require('node-fetch');

var getRouteToQTool = function(id, target, next) {
	let itemRenderingDetails = getItem(id, target);	
	return next(null, itemRenderingDetails);
}

server.method('getRouteToQTool', getRouteToQTool, {});

var graphicRoute = {
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

module.exports = [
	graphicRoute
]