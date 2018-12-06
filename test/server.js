const Hapi = require("hapi");

function getServer() {
  let server = Hapi.server({
    port: process.env.PORT || 3333,
    app: {
      tools: require("./config/tools.js"),
      targets: require("./config/targets.js")
    },
    routes: {
      cors: true
    }
  });

  // mock the auth strategy
  server.auth.scheme("mock", function(server, options) {
    return {
      authenticate: function(request, h) {
        return { credentials: "user" };
      }
    };
  });
  server.auth.strategy("q-auth", "mock");
  return server;
}

module.exports.getServer = getServer;
