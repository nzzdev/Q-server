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
  }
]
