const fetch = require('node-fetch');
const environment = require('../helper/environment');
const getServer = require('../server').getServer;
const server = getServer();
const Boom = require('boom');
const parameter = require('../config/parameter');

var getStylesheet = function(target, tool, name, next) {
  let toolProperties = environment.targets[target].tools[tool];
  fetch(toolProperties.baseUrl + '/stylesheet/' + name)
    .then(response => {
      if (!response.ok) {
        throw Boom.create(response.status, response.statusText);
      }
      return response.text();
    })
    .then(stylesheet => {
      next(null, stylesheet);
    })
    .catch(err => {
      if (err.isBoom) {
        next(err, null);
      } else {
        const error = Boom.badRequest();
        next(error, null);
      }
    })
}

server.method('getStylesheet', getStylesheet, {
  cache: {
    expiresIn: parameter.serverCache * 1000,
    generateTimeout: 3000
  }
});

var styleRoute = {
  method: 'GET',
  path: '/{target}/{tool}/stylesheet/{name}',
  handler: function(request, reply) {
    request.server.methods.getStylesheet(request.params.target, request.params.tool, request.params.name, (err, result) => {
      if (err) {
        return reply(err);
      }
      reply(result)
    })
  },
  config: {
    cache: {
      expiresIn: parameter.cacheControl * 1000,
      privacy: 'public'
    },
    description: 'Returns the css by the given name by proxying the renderer service for the given tool as defined in the environment',
    tags: ['api']
  }
}

module.exports = styleRoute;
