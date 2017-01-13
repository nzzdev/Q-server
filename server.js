const Hapi = require('hapi');
const Hoek = require('hoek');

const targets = require('./config/targets.js');
const misc = require('./config/misc.js');

let hapiOptions = Object.assign(
  {
    app: {
      targets: targets,
      misc: misc
    }
  }
);

var server = new Hapi.Server(hapiOptions);

module.exports.getServer = function() {
  return server;
};

module.exports.setServer = function(newServer) {
  server = newServer;
};
