const Boom = require("boom");
const Joi = require("joi");

const getScreenshotImage = require("./helpers.js").getScreenshotImage;
const getScreenshotInfo = require("./helpers.js").getScreenshotInfo;
const getInnerWidth = require("./helpers.js").getInnerWidth;

module.exports = {
  getRoutes: function(cacheControlHeader) {
    return [
      {
        path: "/screenshot/{id}.{format}",
        method: "GET",
        options: {
          validate: {
            params: {
              id: Joi.string().required(),
              format: Joi.string().valid(["json", "png"])
            },
            query: {
              target: Joi.string().required(),
              width: Joi.number().required(),
              dpr: Joi.number().optional(),
              background: Joi.string().optional(),
              padding: Joi.string()
                .regex(
                  /^$|^(([0-9.]+)(px|em|ex|%|in|cm|mm|pt|pc|vh|vw)?([ ])?){1,4}$/
                )
                .optional(),
              wait: Joi.optional(),
              toolRuntimeConfig: Joi.object().optional()
            },
            options: {
              allowUnknown: true
            }
          },
          tags: ["api"]
        },
        handler: async (request, h) => {
          const targetKey = request.query.target;

          const target = request.server.settings.app.targets
            .get(`/`)
            .find(configuredTarget => {
              return configuredTarget.key === request.query.target;
            });

          if (!target) {
            throw Boom.badRequest("no such target");
          }

          if (target.type !== "web") {
            throw Boom.badRequest("the target is not of type web");
          }

          const toolRuntimeConfig = request.query.toolRuntimeConfig || {};

          // check if there is a given width, if so, send it in toolRuntimeConfig to the rendering-info endpoint
          const width = getInnerWidth(
            request.query.width,
            request.query.padding
          );
          if (width) {
            toolRuntimeConfig.size = {
              width: [
                {
                  value: width,
                  unit: "px",
                  comparison: "="
                }
              ]
            };
          }

          const response = await request.server.inject({
            url: `/rendering-info/${request.params.id}/${
              request.query.target
            }?toolRuntimeConfig=${JSON.stringify(toolRuntimeConfig)}`
          });

          if (response.statusCode !== 200) {
            throw new Boom(response.statusMessage, {
              statusCode: response.statusCode
            });
          }

          const server = response.request.server;
          const renderingInfo = JSON.parse(response.payload);

          let scripts = await server.methods.plugins.q.screenshot.getScripts(
            renderingInfo
          );
          let stylesheets = await server.methods.plugins.q.screenshot.getStylesheets(
            renderingInfo
          );

          // add scripts and stylesheets from publication config
          if (Array.isArray(target.context.scripts)) {
            scripts = target.scripts.context.concat(scripts);
          }
          if (Array.isArray(target.context.stylesheets)) {
            stylesheets = target.context.stylesheets.concat(stylesheets);
          }

          const config = {
            width: request.query.width,
            dpr: request.query.dpr || 1,
            padding: request.query.padding || "0",
            background: request.query.background
          };

          if (request.query.wait !== undefined) {
            if (Number.isNaN(parseInt(request.query.wait))) {
              config.waitBeforeScreenshot = request.query.wait;
            } else {
              config.waitBeforeScreenshot = parseInt(request.query.wait);
            }
          }

          if (request.params.format === "png") {
            const screenshotBuffer = await getScreenshotImage(
              `${server.info.protocol}://localhost:${
                server.info.port
              }/screenshot/empty-page.html`,
              renderingInfo.markup,
              scripts,
              stylesheets,
              config
            );

            const imageResponse = h.response(screenshotBuffer);
            imageResponse
              .type("image/png")
              .header("cache-control", cacheControlHeader);
            return imageResponse;
          } else if (request.params.format === "json") {
            const screenshotInfo = await getScreenshotInfo(
              `${server.info.protocol}://localhost:${
                server.info.port
              }/screenshot/empty-page.html`,
              renderingInfo.markup,
              scripts,
              stylesheets,
              config
            );
            const infoResponse = h.response(screenshotInfo);
            infoResponse.header("cache-control", cacheControlHeader);
            return infoResponse;
          }
        }
      },
      {
        path: "/screenshot/empty-page.html",
        method: "GET",
        handler: (request, h) => {
          return "<!DOCTYPE html><html><head></head><body></body></html>";
        }
      }
    ];
  }
};
