const Hapi = require("@hapi/hapi");
const Joi = require("../helper/custom-joi.js");

function getServer() {
  let server = Hapi.server({
    port: process.env.PORT || 3333,
    app: {
      tools: require("./config/tools.js"),
      targets: require("./config/targets.js"),
    },
    routes: {
      cors: true,
    },
  });

  server.validator(Joi);

  // mock the auth strategy
  server.auth.scheme("mock", function (server, options) {
    return {
      authenticate: function (request, h) {
        return h.authenticated({ credentials: "user" });
      },
    };
  });
  server.auth.strategy("q-auth-azure-then-ld", "mock");
  return server;
}

module.exports.getServer = getServer;
