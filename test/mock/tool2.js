const Hapi = require("@hapi/hapi");

const server = Hapi.server({
  port: 9998,
  routes: {
    cors: true
  }
});

const schema = {
  $schema: "http://json-schema.org/draft-04/schema#",
  title: "mock",
  type: "object",
  properties: {
    foo: {
      type: "string"
    }
  },
  required: ["foo"]
};

server.route({
  method: "GET",
  path: "/",
  handler: function(request, h) {
    return "mock tool running";
  }
});

server.route({
  method: "GET",
  path: "/schema.json",
  handler: function(request, h) {
    return schema;
  }
});

server.route({
  method: "POST",
  path: "/rendering-info/mock",
  handler: function(request, h) {
    return {
      markup: "<div></div>",
      stylesheets: [
        {
          name: "mockstyle"
        }
      ],
      scripts: [
        {
          name: "mockscript"
        }
      ]
    };
  }
});

server.route({
  method: "POST",
  path: "/rendering-info/fail",
  handler: function(request, h) {
    throw new Error("fail");
  }
});

server.route({
  method: "GET",
  path: "/stylesheet/{name}.{hash}.css",
  handler: function(request, h) {
    let background = "black";
    if (request.query.background) {
      background = request.query.background;
    }
    return h
      .response(`body { background: ${background}; }`)
      .type("text/css")
      .header("cache-control", `max-age=${60 * 60 * 24 * 365}, immutable`); // 1 year
  }
});

module.exports = {
  start: async function() {
    await server.start();
  }
};
