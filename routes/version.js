const package = require('../package');

module.exports = {
  path: '/version',
  method: 'GET',
  handler: (request, reply) => {
    reply(package.version);
  }
}