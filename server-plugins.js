module.exports = [
  require('inert'),
  require('vision'),
  require('h2o2'),
  {
    register: require('hapi-swagger'),
    options: {
      info: {
        'title': 'Q server API Documentation',
        'version': require('./package').version,
      }
    }
  },
  {
    register: require('hapi-etags'),
    options: {
      etagOptions: {
        weak: true
      }
    }
  },
  {
    register: require('hapi-alive'),
    options: {
      path: '/health',
      tags: ['health', 'monitor'],
      responses: {
        healthy: {
          message: 'Q server alive'
        },
        unhealthy: {
          statusCode: 500
        }
      },
      healthCheck: function(server, callback) {
        callback();
      }
    }
  }
]
