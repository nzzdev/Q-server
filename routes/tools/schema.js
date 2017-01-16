const Boom = require('boom');
const fetch = require('node-fetch');

module.exports = {
  path: '/tools/{tool}/schema.json',
  method: 'GET',
  handler: (request, reply) => {
    const tool = request.server.settings.app.tools.get(`/${request.params.tool}`);
    
    fetch(`${tool.baseUrl}/schema.json`)
      .then(response => {
        if (response.ok) {
          return response.buffer();
        } else {
          return Boom.notFound()
        }
      })
      .then(res => {
        reply(res)
      })
    
  }
}
