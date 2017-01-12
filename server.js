const Hapi = require('hapi');
const Hoek = require('hoek');

var server = new Hapi.Server();

module.exports.getServer = function() {
  return server;
};

module.exports.setServer = function(newServer) {
  server = newServer;
};
