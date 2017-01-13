const fetch = require('node-fetch');
const getServer = require('../server').getServer;
const server = getServer();
const Boom = require('boom');
const defaults = require('../config/defaults');

var getScript = function(target, tool, name, next) {
  fetch(`${target.tools[tool].baseUrl}/script/${name}`)
    .then(response => {
      if (!response.ok) {
        throw Boom.create(response.status, response.statusText);
      }
      return response.text();
    })
    .then(script => {
      next(null, script);
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

server.method('getScript', getScript, {
  cache: {
    expiresIn: (server.settings.app.misc.get('/cache/serverCacheTime') !== undefined ? server.settings.app.misc.get('/cache/serverCacheTime') : defaults.serverCache),
    generateTimeout: 10000
  },
  generateKey: function(target, tool, scriptName) {
    return `${tool}:${scriptName}:${JSON.stringify(target)}`
  }
});

var scriptRoute = {
  method: 'GET',
  path: '/{target}/{tool}/script/{scriptName}',
  handler: function(request, reply) {
    const target = request.server.settings.app.targets.get(`/${request.params.target}`)
    request.server.methods.getScript(target, request.params.tool, request.params.scriptName, (err, result) => {
      if (err) {
        return reply(err);
      }
      reply(result);
    })
  },
  config: {
    cache: {
      expiresIn: (server.settings.app.misc.get('/cache/cacheControl/maxAge') || defaults.cacheControl.maxAge) * 1000,
      privacy: 'public'
    },
    description: 'Returns the script by the given name by proxying the renderer service for the given tool as defined in the environment',
    tags: ['api']
  }
}

module.exports = scriptRoute;
