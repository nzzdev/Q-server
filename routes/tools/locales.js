const fetch = require('node-fetch');
const server = require('../../server').getServer();
const Boom = require('boom');

var getTranslations = function(tool, lng, next) {
  const baseUrl = server.settings.app.tools.get(`/${tool}/baseUrl`);
  console.log(`${baseUrl}/locales/${lng}/translation.json`)
  fetch(`${baseUrl}/locales/${lng}/translation.json`)
    .then(response => {
      if (!response.ok) {
        throw Boom.create(response.status, response.statusText);
      }
      return response.json();
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

server.method('getTranslations', getTranslations, {
  cache: {
    expiresIn: server.settings.app.misc.get('/cache/serverCacheTime'),
    generateTimeout: 10000
  }
});

var route = {
  method: 'GET',
  path: '/tools/{tool}/locales/{lng}/translation.json',
  handler: function(request, reply) {
    let lng = request.params.lng;    
    request.server.methods.getTranslations(request.params.tool, lng, (err, result) => {
      if (err) {
        return reply(err);
      }
      return reply(result);
    })
  },
  config: {
    cache: {
      expiresIn: server.settings.app.misc.get('/cache/cacheControl/maxAge') * 1000,
      privacy: 'public'
    },
    description: 'Returns the translations by the given language by proxying the renderer service for the given tool as defined in the environment',
    tags: ['api']
  }
}

module.exports = route;
