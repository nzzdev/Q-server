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
      path: "/export-options-schema/{itemId}/{target}.json",
      method: "GET",
      options: {
        description:
          "compiles the export-options for the item with the given id",
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

        let exportOptionsSchema = {};

        // load the display-options from the tool for compat reasons
        try {
          const toolDisplayOptionsResponse = await request.server.app.wreck.get(
            `${tool.baseUrl}/display-options-schema.json`,
            { json: true }
          );
          exportOptionsSchema = getMergedSchema(
            exportOptionsSchema,
            toolDisplayOptionsResponse.payload
          );
        } catch (err) {
          Bounce.rethrow(err, "system");
          // ignore 404 errors, because the tool doesn't have to serve a display-options-schema
          if (err.output.statusCode !== 404) {
            throw err;
          }
        }
        // load the export-options from the tool
        try {
          const toolExportOptionsResponse = await request.server.app.wreck.get(
            `${tool.baseUrl}/export-options-schema.json`,
            { json: true }
          );
          exportOptionsSchema = getMergedSchema(
            exportOptionsSchema,
            toolExportOptionsResponse.payload
          );
        } catch (err) {
          Bounce.rethrow(err, "system");
          // ignore 404 errors, because the tool doesn't have to serve an export-options-schema
          if (err.output.statusCode !== 404) {
            throw err;
          }
        }

        // load the export-options from toolEndpoint config
        if (tool.endpoint.exportOptionsSchema) {
          if (tool.endpoint.exportOptionsSchema instanceof Function) {
            toolEndpointExportOptionsSchema = await tool.endpoint.exportOptionsSchema.apply(
              this,
              [
                {
                  item,
                  tool,
                  target,
                  exportOptionsSchema
                }
              ]
            );
            exportOptionsSchema = getMergedSchema(
              exportOptionsSchema,
              toolEndpointExportOptionsSchema
            );
          } else {
            exportOptionsSchema = getMergedSchema(
              exportOptionsSchema,
              tool.endpoint.exportOptionsSchema
            );
          }
        }

        // load the export options from target config
        if (target.exportOptionsSchema) {
          if (target.exportOptionsSchema instanceof Function) {
            toolEndpointExportOptionsSchema = await target.exportOptionsSchema.apply(
              this,
              [
                {
                  item,
                  tool,
                  target,
                  exportOptionsSchema
                }
              ]
            );
            exportOptionsSchema = getMergedSchema(
              exportOptionsSchema,
              toolEndpointExportOptionsSchema
            );
          } else {
            exportOptionsSchema = getMergedSchema(
              exportOptionsSchema,
              target.exportOptionsSchema
            );
          }
        }

        // merge and return
        return exportOptionsSchema;
      }
    };
  }
};
