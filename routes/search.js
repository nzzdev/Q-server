const getDb = require('../db.js').getDb;
const Joi = require('joi');

module.exports = {
  path: '/search',
  method: 'POST',
  config: {
    validate: {
      payload: Joi.object().required()
    }
  },
  handler: (request, reply) => {
    let db = getDb();
    db.search('items', 'search', request.payload, (err, data) => {
      if (err) {
        return reply(Boom.internal(err));
      } else {
        return reply(data);
      }
    })
  }
}
