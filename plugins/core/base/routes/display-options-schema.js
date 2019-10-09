const Joi = require("@hapi/joi");
const Bounce = require("@hapi/bounce");
const deepmerge = require("deepmerge");

function getMergedSchema(a, b) {
  return deepmerge(a, b, {
    arrayMerge: (destArr, srcArr) => {
      return [...new Set(srcArr.concat(destArr))]; // merge unique
    }
  });
}

module.exports = {
  getGetRoute: function(options) {
    return {
      path: "/display-options-schema/{itemId}/{target}.json",
      method: "GET",
      options: {
        description:
          "compiles the display-options for the item with the given id and the specified target",
        tags: ["api"],
        validate: {
          params: {
            itemId: Joi.string().required(),
            target: Joi.string().required()
          }
        }
      },
      handler: async (request, h) => {
        // load item with given id
        const item = await request.server.methods.db.item.getById({
          id: request.params.itemId,
          ignoreInactive: true,
          session: {
            credentials: request.auth.credentials,
            artifacts: request.auth.artifacts
          }
        });

        // load the tool config
        const tool = request.server.settings.app.tools.get(`/${item.tool}`, {
          target: request.params.target
        });

        // load the target config
        const target = request.server.settings.app.targets.get(
          `/${request.params.target}`
        );

        let displayOptionsSchema = {};

        // load the display-options from the tool with appendItemToPayload
        const displayOptionsWithItemResponse = await request.server.inject(
          `/tools/${item.tool}/display-options-schema.json?appendItemToPayload=${request.params.itemId}`
        );
        if (displayOptionsWithItemResponse.statusCode === 200) {
          displayOptionsSchema = getMergedSchema(
            displayOptionsSchema,
            displayOptionsWithItemResponse.result
          );
        }

        // load the display-options from the tool without appendItemToPayload
        const displayOptionsWithoutItemResponse = await request.server.inject(
          `/tools/${item.tool}/display-options-schema.json`
        );
        if (displayOptionsWithoutItemResponse.statusCode === 200) {
          displayOptionsSchema = getMergedSchema(
            displayOptionsSchema,
            displayOptionsWithoutItemResponse.result
          );
        }

        // load the export-options from toolEndpoint config
        if (tool.endpoint.displayOptionsSchema) {
          if (tool.endpoint.displayOptionsSchema instanceof Function) {
            toolEndpointDisplayOptionsSchema = await tool.endpoint.displayOptionsSchema.apply(
              this,
              [
                {
                  item,
                  tool,
                  target,
                  displayOptionsSchema
                }
              ]
            );
            if (toolEndpointDisplayOptionsSchema) {
              displayOptionsSchema = getMergedSchema(
                displayOptionsSchema,
                toolEndpointDisplayOptionsSchema
              );
            }
          } else {
            displayOptionsSchema = getMergedSchema(
              displayOptionsSchema,
              tool.endpoint.displayOptionsSchema
            );
          }
        }

        // load the export options from target config
        if (target.displayOptionsSchema) {
          if (target.displayOptionsSchema instanceof Function) {
            toolEndpointDisplayOptionsSchema = await target.displayOptionsSchema.apply(
              this,
              [
                {
                  item,
                  tool,
                  target,
                  displayOptionsSchema
                }
              ]
            );
            if (toolEndpointDisplayOptionsSchema) {
              displayOptionsSchema = getMergedSchema(
                displayOptionsSchema,
                toolEndpointDisplayOptionsSchema
              );
            }
          } else {
            displayOptionsSchema = getMergedSchema(
              displayOptionsSchema,
              target.displayOptionsSchema
            );
          }
        }

        // return the complete export options schema
        return displayOptionsSchema;
      }
    };
  }
};
