const fetch = require('node-fetch');
const environment = require('../helper/environment');
const server = require('../server');
const Boom = require('boom');

var getScript = function(target, tool, name, next) {
	let toolProperties = environment.targets[target].tools[tool];
	fetch(toolProperties.baseUrl + '/scripts/' + name)
		.then(response => {
			next(null, response.buffer());
		})
		.catch(err => {
			const error = Boom.badRequest();
			next(error, null);
		})
}

server.method('getScript', getScript, {
  cache: {
    cache: 'memoryCache',
    expiresIn: 30 * 60 * 1000,
    generateTimeout: 3000
  }
});

var scriptRoute = {
	method: 'GET',
	path: '/Q/{target}/script/{tool}/{name}',
	handler: function(request, reply) {
		server.methods.getScript(request.params.target, request.params.tool, request.params.name, (err, result) => {
			if (err) {
				return reply(err);
			}
			reply(result);
		})
	},
	config: {
		description: 'Get script from Q tool',
		tags: ['api']
	}
} 

module.exports = scriptRoute;