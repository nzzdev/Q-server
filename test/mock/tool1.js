const Hapi = require("@hapi/hapi");
const Joi = require("@hapi/joi");

const server = Hapi.server({
  port: 9999,
  routes: {
    cors: true
  }
});
server.validator(Joi);

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

const displayOptionsSchema = {
  $schema: "http://json-schema.org/draft-04/schema#",
  title: "display option mock",
  type: "object",
  properties: {
    foo: {
      type: "boolean"
    }
  }
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
  method: "GET",
  path: "/display-options-schema.json",
  handler: function(request, h) {
    return displayOptionsSchema;
  }
});

server.route({
  method: "POST",
  path: "/display-options-schema.json",
  handler: function(request, h) {
    if (request.payload.item.dynamicDisplayOptionsSchema !== undefined) {
      displayOptionsSchema.properties = Object.assign(
        displayOptionsSchema.properties,
        request.payload.item.dynamicDisplayOptionsSchema
      );
    }
    return displayOptionsSchema;
  }
});

server.route({
  method: "POST",
  path: "/rendering-info/mock",
  options: {
    validate: {
      options: {
        allowUnknown: true
      },
      payload: {
        item: Joi.object().required()
      }
    }
  },
  handler: function(request, h) {
    return {
      markup: `<h1>${request.payload.item.title} - itemStateInDb: ${request.payload.itemStateInDb}</h1>`,
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

server.route({
  method: "POST",
  path: "/endpoint-returning-the-id-from-tool-in-payload",
  handler: function(request, h) {
    return request.payload.item._id;
  }
});

server.route({
  method: "GET",
  path: "/fixtures/data",
  handler: function(request, h) {
    return [
      {
        title: "FIXTURE: mock",
        foo: "bar"
      }
    ];
  }
});

module.exports = {
  start: async function() {
    await server.start();
  }
};
