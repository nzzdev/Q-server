const Joi = require('joi');
const Boom = require('boom');

module.exports = {
  name: 'q-statistics',
  dependencies: 'q-db',
  register: async function (server, options) {
    server.route({
      path: '/statistics/number-of-items/{since?}',
      method: 'GET',
      options: {
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

    server.route({
      path: '/statistics/number-of-items-per-day/{daysInThePast}',
      method: 'GET',
      options: {
        validate: {
          params: {
            daysInThePast: Joi.number()
          }
        },
        description: 'returns the number of items per day for n days in the past',
        tags: ['api', 'statistics', 'non-critical']
      },
      handler: async (request, h) => {
        // calculate the startkey for the db view
        const date = new Date();
        date.setDate(date.getDate() - request.params.daysInThePast);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        if (month < 10) {
          month = '0' + month;
        }
        var day = date.getDate();
        if (day < 10) {
          day = '0' + day;
        }

        const options = {
          startkey: '' + year + month + day,
          group: true
        }

        const returnValue = await new Promise((resolve, reject) => {
          server.app.db.view('items', 'numberOfItemsPerDay', options, (err, data) => {
            if (err) {
              return reject(Boom.internal(err));
            } else {
              if (data.rows.length === 0) {
                return resolve({
                  value: 0
                });
              }
              return resolve(data.rows);
            }
          })
        });
        return returnValue;
      }
    });
  }
}
