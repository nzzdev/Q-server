const getItem = require('../processing/markup-fetcher');
const server = require('../server');
const Fetch = require('node-fetch');

var getRouteToQTool = function(id, type, next) {
	let itemRenderingDetails = getItem(id);	
	return next(null, itemRenderingDetails);
}

server.method('getRouteToQTool', getRouteToQTool, {});

var graphicRoute = {
  method: 'GET',
  path: '/Q/{id}/{type}',
  config: {
      handler: function (request, reply) {
      	server.methods.getRouteToQTool(request.params.id, request.params.type, (err, result) => {
      		if (err) {
      			return reply(err);
      		} 
      		reply(result);
      	});
      },
      description: 'Get Q-item',
      notes: 'dev',
      tags: ['api']
  }
}

module.exports = [
	graphicRoute
]