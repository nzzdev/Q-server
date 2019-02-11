const Joi = require("joi");
const Boom = require("boom");
const jsonSchemaRefParser = require("json-schema-ref-parser");

async function getDereferencedSchema(schema) {
  let dereferencedSchema = await jsonSchemaRefParser.dereference(schema);
  // delete the definition property as we do not need it anymore in the dereferenced schema
  delete dereferencedSchema.definitions;
  return dereferencedSchema;
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
          }
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
    };
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
