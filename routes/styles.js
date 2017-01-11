const fetch = require('node-fetch');
const environment = require('../helper/environment');
const server = require('../server');
const Boom = require('boom');

var getStylesheet = function(target, tool, name, next) {
	let toolProperties = environment.targets[target].tools[tool];
	fetch(toolProperties.baseUrl + '/styles/' + name)
		.then(response => {
			return response.text();
		})
		.then(stylesheet => {
			next(null, stylesheet);
		})
		.catch(err => {
			const error = Boom.badRequest();
			next(error, null)
		})
}

server.method('getStylesheet', getStylesheet, {
  cache: {
    cache: 'memoryCache',
    expiresIn: 60 * 1000,
    generateTimeout: 3000
  }
});

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
		cache: {
			expiresIn: 60 * 1000, 
			privacy: 'public'
		},
		description: 'Get stylesheet from Q tool',
		tags: ['api']
	}
} 

module.exports = styleRoute;