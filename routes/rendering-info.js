const renderingInfoFetcher = require('../processing/rendering-info-fetcher');
const Boom = require('boom');
const server = require('../server').getServer();

const getRenderingInfo = function(id, target, next) {
  renderingInfoFetcher.getRenderingInfo(id, target)
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
  }
});

var renderingInfoRoute = {
  method: 'GET',
  path: '/rendering-info/{id}/{target}/{width?}',
  handler: function(request, reply) {
    request.server.methods.getRenderingInfo(request.params.id, request.params.target, (err, result) => {
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
    description: 'Returns rendering information for the given graphic id and target (as configured in the environment).',
    tags: ['api']
  }
}

module.exports = renderingInfoRoute;
