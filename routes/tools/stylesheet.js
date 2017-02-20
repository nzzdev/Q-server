const fetch = require('node-fetch');
const server = require('../../server').getServer();
const Boom = require('boom');

var getStylesheet = function(tool, stylesheetName, next) {
  const baseUrl = server.settings.app.tools.get(`/${tool}/baseUrl`);
  fetch(`${baseUrl}/stylesheet/${stylesheetName}`)
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
    expiresIn: server.settings.app.misc.get('/cache/serverCacheTime'),
    generateTimeout: 10000
  }
});

var styleRoute = {
  method: 'GET',
  path: '/tools/{tool}/stylesheet/{stylesheetName}',
  handler: function(request, reply) {
    request.server.methods.getStylesheet(request.params.tool, request.params.stylesheetName, (err, result) => {
      if (err) {
        return reply(err);
      }
      return reply(result).type('text/css')
    })
  },
  config: {
    cache: {
      expiresIn: server.settings.app.misc.get('/cache/cacheControl/maxAge') * 1000,
      privacy: 'public'
    },
    description: 'Returns the css by the given name by proxying the renderer service for the given tool as defined in the environment',
    tags: ['api']
  }
}

module.exports = styleRoute;
