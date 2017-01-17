const fetch = require('node-fetch');
const server = require('../../server').getServer();
const Boom = require('boom');

var getScript = function(tool, scriptName, next) {
  const baseUrl = server.settings.app.tools.get(`/${tool}/baseUrl`);
  fetch(`${baseUrl}/script/${scriptName}`)
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
    expiresIn: server.settings.app.misc.get('/cache/serverCacheTime'),
    generateTimeout: 10000
  }
});

var scriptRoute = {
  method: 'GET',
  path: '/tools/{tool}/script/{scriptName}',
  handler: function(request, reply) {
    request.server.methods.getScript(request.params.tool, request.params.scriptName, (err, result) => {
      if (err) {
        return reply(err);
      }
      return reply(result).type('text/javascript');
    })
  },
  config: {
    cache: {
      expiresIn: server.settings.app.misc.get('/cache/cacheControl/maxAge') * 1000,
      privacy: 'public'
    },
    description: 'Returns the script by the given name by proxying the renderer service for the given tool as defined in the environment',
    tags: ['api']
  }
}

module.exports = scriptRoute;
