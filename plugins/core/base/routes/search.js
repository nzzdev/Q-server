const Boom = require('boom');
const Joi = require('joi');

module.exports = {
  path: '/search',
  method: 'POST',
  options: {
    validate: {
      payload: Joi.object().required()
    },
    tags: ['api', 'editor']
  },
  handler: async (request, h) => {
    let db = getDb();
    return request.server.methods.item.search(request.payload);
  }
}
