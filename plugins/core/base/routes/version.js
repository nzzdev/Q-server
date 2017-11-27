const package = require('../../../../package.json');

module.exports = {
  path: '/version',
  method: 'GET',
  handler: (request, h) => {
    return package.version;
  }
}