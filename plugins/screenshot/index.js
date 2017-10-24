const routes = require('./routes.js');

const screenshot = {
  register: function(server, options, next) {
    
    server.route(routes);

    next();
  }
}

screenshot.register.attributes = {
  name: 'q-screenshot'
}

module.exports = screenshot;