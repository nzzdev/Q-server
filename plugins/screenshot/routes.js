const Boom = require("@hapi/boom");
const Joi = require("../../helper/custom-joi.js");

const getScreenshotImage = require("./helpers.js").getScreenshotImage;
const getScreenshotInfo = require("./helpers.js").getScreenshotInfo;
const getInnerWidth = require("./helpers.js").getInnerWidth;

const queryFormat = {
  target: Joi.string().required(),
  width: Joi.number().required(),
  dpr: Joi.number().optional(),
  background: Joi.string().optional(),
  padding: Joi.string()
    .regex(/^$|^(([0-9.]+)(px|em|ex|%|in|cm|mm|pt|pc|vh|vw)?([ ])?){1,4}$/)
    .optional(),
  wait: Joi.optional(),
  toolRuntimeConfig: Joi.object().optional(),
};

async function getScreenshotResponse(server, h, params, item) {
  const target = server.settings.app.targets.get(`/${params.target}`);

  if (!target) {
    throw Boom.badRequest("no such target");
  }

  if (target.type !== "web") {
    throw Boom.badRequest("the target is not of type web");
  }

  const toolRuntimeConfig = params.toolRuntimeConfig || {};

  // check if there is a given width, if so, send it in toolRuntimeConfig to the rendering-info endpoint
  const width = getInnerWidth(params.width, params.padding);
  if (width) {
    toolRuntimeConfig.size = {
      width: [
        {
          value: width,
          unit: "px",
          comparison: "=",
        },
      ],
    };
  }

  const response = await server.inject({
    method: "POST",
    url: `/rendering-info/${params.target}`,
    payload: {
      toolRuntimeConfig: toolRuntimeConfig,
      item: item,
      ignoreInactive: true,
    },
  });

  if (response.statusCode !== 200) {
    throw new Boom.Boom(
      `Failed to get renderingInfo to load in headless chrome for screenshot for ${item.tool} and ${params.target} with the error: ${response.statusMessage}`,
      {
        statusCode: response.statusCode,
      }
    );
  }

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
    width: params.width,
    dpr: params.dpr || 1,
    padding: params.padding || "0",
    background: params.background,
  };

  if (params.wait !== undefined) {
    if (!Number.isNaN(parseInt(params.wait))) {
      config.waitBeforeScreenshot = parseInt(params.wait);
    }
  }

  if (params.format === "png") {
    const screenshotBuffer = await getScreenshotImage(
      `${server.info.protocol}://localhost:${server.info.port}/screenshot/empty-page.html`,
      renderingInfo.markup,
      scripts,
      stylesheets,
      config
    );

    const imageResponse = h.response(screenshotBuffer);
    imageResponse.type("image/png");
    return imageResponse;
  } else if (params.format === "json") {
    const screenshotInfo = await getScreenshotInfo(
      `${server.info.protocol}://localhost:${server.info.port}/screenshot/empty-page.html`,
      renderingInfo.markup,
      scripts,
      stylesheets,
      config
    );
    const infoResponse = h.response(screenshotInfo);
    return infoResponse;
  }
}

module.exports = {
  getRoutes: function (cacheControlHeader) {
    return [
      {
        path: "/screenshot/{id}.{format}",
        method: "GET",
        options: {
          validate: {
            params: {
              id: Joi.string().required(),
              format: Joi.string().valid("json", "png"),
            },
            query: queryFormat,
            options: {
              allowUnknown: true,
            },
          },
          tags: ["api"],
        },
        handler: async (request, h) => {
          const item = await request.server.methods.db.item.getById({
            id: request.params.id,
            ignoreInactive: request.query.ignoreInactive,
            session: {
              credentials: request.auth.credentials,
              artifacts: request.auth.artifacts,
            },
          });
          const screenshotConfig = Object.assign({}, request.query, {
            format: request.params.format,
          });
          const response = await getScreenshotResponse(
            request.server,
            h,
            screenshotConfig,
            item
          );
          response.header("cache-control", cacheControlHeader);
          return response;
        },
      },
      {
        path: "/screenshot.{format}",
        method: "POST",
        options: {
          validate: {
            params: {
              format: Joi.string().valid("json", "png"),
            },
            payload: {
              item: Joi.object().required(),
              toolRuntimeConfig: Joi.object().optional(),
            },
            query: queryFormat,
            options: {
              allowUnknown: true,
            },
          },
          tags: ["api"],
        },
        handler: async (request, h) => {
          const screenshotConfig = Object.assign({}, request.query, {
            format: request.params.format,
          });
          if (request.payload.toolRuntimeConfig) {
            screenshotConfig.toolRuntimeConfig = Object.assign(
              screenshotConfig.toolRuntimeConfig || {},
              request.payload.toolRuntimeConfig
            );
          }
          const response = await getScreenshotResponse(
            request.server,
            h,
            screenshotConfig,
            request.payload.item
          );
          response.header("cache-control", cacheControlHeader);
          return response;
        },
      },
      {
        path: "/screenshot/empty-page.html",
        method: "GET",
        handler: (request, h) => {
          return "<!DOCTYPE html><html><head></head><body></body></html>";
        },
      },
    ];
  },
};
