const Joi = require("joi");
const jsonSchemaRefParser = require("json-schema-ref-parser");

async function getDereferencedSchema(schema) {
  let dereferencedSchema = await jsonSchemaRefParser.dereference(schema);
  // delete the definition property as we do not need it anymore in the dereferenced schema
  delete dereferencedSchema.definitions;
  return dereferencedSchema;
}

module.exports = {
  getSchema: function (options) {
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
          query: {
            appendItemToPayload: Joi.string().optional()
          }
        }
      },
      handler: async (request, h) => {
        request.params.path = "schema.json";
        const response = await Reflect.apply(request.server.methods.getToolResponse, this, [
          options,
          request,
          h
        ]);
        const schema = JSON.parse(response.source.toString());
        return getDereferencedSchema(schema);
      }
    }
  },
  getDisplayOptionsSchema: function (options) {
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
        const response = await Reflect.apply(request.server.methods.getToolResponse, this, [
          options,
          request,
          h
        ]);
        const schema = JSON.parse(response.source.toString());
        return getDereferencedSchema(schema);
      }
    }
  }
};
