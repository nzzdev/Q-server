const Joi = require('joi');
const Boom = require('boom');

module.exports = {
  name: 'q-statistics',
  dependencies: 'q-db',
  register: async function (server, options) {
    server.route({
      path: '/statistics/number-of-items/{since?}',
      method: 'GET',
      config: {
        validate: {
          params: {
            since: Joi.number().optional()
          }
        },
        description: 'returns the number of items. If given since the timestamp passed.',
        tags: ['api', 'statistics', 'non-critical']
      },
      handler: async (request, h) => {
        const db = request.server.app.db;
    
        const options = {
          reduce: 'true'
        }
    
        if (request.params.since) {
          options.startkey = request.params.since;
        }

        const returnValue = await new Promise((resolve, reject) => {
          db.view('items', 'numberOfItems', options, (err, data) => {
            if (err) {
              return reject(Boom.internal(err));
            } else {
              if (data.rows.length === 0) {
                return resolve({
                  value: 0
                });
              }
              return resolve({
                value: data.rows[0].value
              });
            }
          })
        });
        return returnValue;
      }
    })
  }
}