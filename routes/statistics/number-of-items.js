const getDb = require('../../db.js').getDb;
const Joi = require('joi');

module.exports = {
  path: '/statistics/number-of-items/{since?}',
  method: 'GET',
  config: {
    validate: {
      params: {
        since: Joi.number().optional()
      }
    }
  },
  handler: (request, reply) => {
    let db = getDb();

    let options = {
      reduce: 'true'
    }

    if (request.params.since) {
      options.startkey = request.params.since;
    }

    db.view('items', 'numberOfItems', options, (err, data) => {
      if (err) {
        return reply(Boom.internal(err));
      } else {
        if (data.rows.length === 0) {
          return reply({
            value: 0
          })
        }

        return reply({
          value: data.rows[0].value
        });
      }
    })
  }
}
