const fetch = require('node-fetch');
const environment = require('../helper/environment');
const server = require('../server');
const Boom = require('boom');

var getStylesheet = function(target, tool, name, next) {
	let toolProperties = environment.targets[target].tools[tool];
	fetch(toolProperties.baseUrl + '/styles/' + name)
		.then(response => {
			next(null, response.buffer());
		})
		.catch(err => {
			const error = Boom.badRequest();
			next(error, null)
		})
}

server.method('getStylesheet', getStylesheet, {});

var styleRoute = {
	method: 'GET',
	path: '/Q/{target}/style/{tool}/{name}',
	handler: function(request, reply) {
		server.methods.getStylesheet(request.params.target, request.params.tool, request.params.name, (err, result) => {
			if (err) {
				return reply(err);
			}
			reply(result)
		})
	},
	config: {
		description: 'Get stylesheet from Q tool',
		tags: ['api']
	}
} 

module.exports = styleRoute;