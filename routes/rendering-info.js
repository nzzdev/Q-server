const renderingInfoFetcher = require('../processing/rendering-info-fetcher');
const Boom = require('boom');
const getServer = require('../server').getServer;
const server = getServer();

const getRenderingInfo = function(target, id, itemDbBaseUrl, next) {
  renderingInfoFetcher.getRenderingInfo(target, id, itemDbBaseUrl)
    .then(renderingInfo => {
      next(null, renderingInfo);
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

server.method('getRenderingInfo', getRenderingInfo, {
  cache: {
    expiresIn: server.settings.app.misc.get('/cache/serverCacheTime'),
    generateTimeout: 10000
  },
  generateKey: function(target, id, itemDbBaseUrl) {
    return `${id}:${itemDbBaseUrl}:${JSON.stringify(target)}`
  }
});

var renderingInfoRoute = {
  method: 'GET',
  path: '/{target}/{id}',
  handler: function(request, reply) {
    
    const target = request.server.settings.app.targets.get(`/${request.params.target}`)
    const itemDbBaseUrl = request.server.settings.app.misc.get('/itemDbBaseUrl');
    request.server.methods.getRenderingInfo(target, request.params.id, itemDbBaseUrl, (err, result) => {
      if (err) {
        return reply(err);
      }
      reply(result);
    })
  },
  config: {
    cache: {
      expiresIn: server.settings.app.misc.get('/cache/cacheControl/maxAge') * 1000,
      privacy: 'public'
    },
    description: 'Returns rendering information for the given graphic id and target (as configured in the environment). Also dependant on the tool, which is derived from the graphic database entry.',
    notes: 'dev',
    tags: ['api']
  }
}

module.exports = renderingInfoRoute;
