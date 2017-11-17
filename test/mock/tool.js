const Hapi = require('hapi');

const server = Hapi.server({
  port: 9999,
  routes: {
    cors: true
  }
});

server.route({
  method: 'GET',
  path: '/',
  handler: function(request, h) {
    return 'mock tool running'
  }
});

server.route({
  method: 'POST',
  path: '/rendering-info/mock',
  handler: function(request, h) {
    return {
      markup: '<div></div>',
      stylesheets: [
        {
          name: 'mockstyle'
        }
      ],
      scripts: [
        {
          name: 'mockscript'
        }
      ]
    }
  }
});

module.exports = {
  start: async function() {
    await server.start();
  }
}
