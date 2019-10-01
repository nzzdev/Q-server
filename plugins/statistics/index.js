const Joi = require("@hapi/joi");
const Boom = require("@hapi/boom");

module.exports = {
  name: "q-statistics",
  dependencies: "q-db",
  register: async function(server, options) {
    server.route({
      path: "/statistics/number-of-items/{since?}",
      method: "GET",
      config: {
        auth: {
          strategies: ["q-auth"],
          mode: "optional"
        },
        cors: {
          credentials: true
        },
        validate: {
          params: {
            since: Joi.number().optional()
          }
        },
        description:
          "returns the number of items. If given since the timestamp passed.",
        tags: ["api", "statistics", "non-critical"]
      },
      handler: async (request, h) => {
        const value = await request.server.methods.db.statistics.getNumberOfItems(
          {
            since: request.params.since,
            session: {
              credentials: request.auth.credentials,
              artifacts: request.auth.artifacts
            }
          }
        );
        return {
          value: value
        };
      }
    });
  }
};
