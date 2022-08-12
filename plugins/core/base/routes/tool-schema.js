const Joi = require("../../../../helper/custom-joi.js");
const Boom = require("@hapi/boom");
const jsonSchemaRefParser = require("json-schema-ref-parser");

async function getDereferencedSchema(schema) {
  let dereferencedSchema = await jsonSchemaRefParser.dereference(schema);
  // delete the definition property as we do not need it anymore in the dereferenced schema
  delete dereferencedSchema.definitions;
  return dereferencedSchema;
}

function integrateCustomSchema(schema, customSchema, customSchemaDefinitions) {
  if (!schema || !customSchema) return schema;
  if (Object.keys(customSchema).length === 0) return schema;

  let newFullSchemaProperties = {};
  let newFullSchemaDefinitions = {};

  Object.keys(schema.properties).forEach((propertyKey) => {
    // Replace data table with custom element(s)
    if (propertyKey === "data") {
      for (const customPropertyKey of Object.keys(customSchema)) {
        newFullSchemaProperties[customPropertyKey] = customSchema[customPropertyKey];
      }
    } else {
      newFullSchemaProperties[propertyKey] = schema.properties[propertyKey];
    }
  });

  if (customSchemaDefinitions) {
    if (schema.definitions) newFullSchemaDefinitions = schema.definitions;
    for (const customPropertyKey of Object.keys(customSchemaDefinitions)) {
      newFullSchemaDefinitions[customPropertyKey] = customSchemaDefinitions[customPropertyKey];
    }
  }

  schema.properties = newFullSchemaProperties;
  schema.definitions = newFullSchemaDefinitions;

  return schema;
}

module.exports = {
  getSchema: function(options) {
    return {
      path: "/tools/{tool}/schema.json",
      method: "GET",
      options: {
        description:
          "Returns the dereferenced schema by proxying the renderer service for the given tool as defined in the environment",
        tags: ["api", "editor"],
        validate: {
          params: {
            tool: Joi.string().required()
          },
        }
      },
      handler: async (request, h) => {
        // this is done in the handler and not with Joi as hapi-swagger has issues with `forbidden`.
        if (request.query.appendItemToPayload !== undefined) {
          return Boom.badRequest(
            "appending the item to the request to the tool is not allowed. The tool schema needs to be static to be able to validate the item data against the schema."
          );
        }
        request.params.path = "schema.json";
        const response = await Reflect.apply(
          request.server.methods.getToolResponse,
          this,
          [options, request, h]
        );
        const schema = JSON.parse(response.source.toString());
        return getDereferencedSchema(schema);
      }
    }
  },
  postSchema: function(options) {
    return {
      path: "/tools/{tool}/schema.json",
      method: "POST",
      options: {
        description:
          "Returns the dereferenced schema by proxying the renderer service for the given tool as defined in the environment. Takes a custom schema as payload and integrates it into the tool schema.",
        tags: ["api", "editor"],
        payload: {
          allow: ["application/json"],
        },
        validate: {
          params: {
            tool: Joi.string().required(),
          },
          payload: {
            customSchema: Joi.object().required(),
            customSchemaDefinitions: Joi.object(),
          },
        }
      },
      handler: async (request, h) => {
        let customSchema = request.payload.customSchema;
        let customSchemaDefinitions = request.payload.customSchemaDefinitions;

        // Prepare call of server method 'getToolResponse'
        request.params.path = "schema.json";
        request.payload = undefined; // payload will be send to the tool, that's why we need to remove it here

        // Get tool schema
        const response = await Reflect.apply(
          request.server.methods.getToolResponse,
          this,
          [options, request, h]
        );
        
        // Integrate 'customSchema' into tool schema
        const schema = integrateCustomSchema(
          JSON.parse(response.source.toString()),
          customSchema,
          customSchemaDefinitions
        );

        return getDereferencedSchema(schema);
      }
    }
  },
  getDisplayOptionsSchema: function(options) {
    return {
      path: "/tools/{tool}/display-options-schema.json",
      method: "GET",
      options: {
        description:
          "Returns the dereferenced schema by proxying the renderer service for the given tool as defined in the environment",
        tags: ["api", "editor"],
        validate: {
          params: {
            tool: Joi.string().required()
          },
          query: {
            appendItemToPayload: Joi.string().optional()
          }
        }
      },
      handler: async (request, h) => {
        request.params.path = "display-options-schema.json";
        const response = await Reflect.apply(
          request.server.methods.getToolResponse,
          this,
          [options, request, h]
        );
        if (response.isBoom) {
          return response;
        }
        const schema = JSON.parse(response.source.toString());
        return getDereferencedSchema(schema);
      }
    };
  }
};
