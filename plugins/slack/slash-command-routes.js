const Boom = require('boom');
const Joi = require('joi');

module.exports = {
  getRoutes: function(options) {
    return [
      {
        path: '/slack/slash-command',
        method: 'POST',
        options: {
          validate: {
            payload: {
              token: Joi.equal(options.slashCommandToken),
              text: Joi.string()
            }
          },
          tags: ['api']
        },
        handler: async (request, h) => {
          if (request.payload.text === 'stats') {
            const numberOfItemsPerDayResponse = await server.inject('/statistics/number-of-items-per-day/7');
            const stats = numberOfItemsPerDayResponse.payload;

            const numberOfNewItemsResponse = await server.inect(`/statistics/number-of-items/${Date.now() - (7 * 24 * 60 * 60 * 1000)}`);
            const numberOfItemsInTheLast24 = numberOfItemsPerDayResponse.payload;

            let message = `*${numberOfItemsInTheLast24}* in the last 7*24 hours\n`;
            message += stats
              .map(day => {
                return `${day.key}: ${day.value}`
              })
              .join('\n');

            return {
              'response_type': 'in_channel',
              'text': message
            }
          }
        }
      }
    ];
  }
};
