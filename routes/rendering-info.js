const renderingInfoFetcher = require('../processing/rendering-info-fetcher');
const server = require('../server');
const parameter = require('../config/parameter');
const Boom = require('boom');

var getRenderingInfo = function(id, target, next) {
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
    cache: 'memoryCache',
    expiresIn: parameter.serverCache * 1000,
    generateTimeout: 3000
  }
});

var renderingInfoRoute = {
  method: 'GET',
  path: '/{target}/{id}',
  handler: function(request, reply) {
    server.methods.getRenderingInfo(request.params.id, request.params.target, (err, result) => {
      if (err) {
        return reply(err);
      }
      reply(result);
    })
  },
  config: {
    cache: {
      expiresIn: parameter.cacheControl * 1000,
      privacy: 'public'
    },
    description: 'Returns rendering information for the given graphic id and target (as configured in the environment). Also dependant on the tool, which is derived from the graphic database entry.',
    notes: 'dev',
    tags: ['api']
  }
}

module.exports = renderingInfoRoute;