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
    return request.server.methods.db.item.search(request.payload);
  }
}
