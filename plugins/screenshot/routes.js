const Boom = require('boom');
const Joi = require('joi');

const getScreenshot = require('./helpers.js').getScreenshot;

module.exports = [
  {
    path: '/screenshot/{id}.png',
    method: 'GET',
    options: {
      validate: {
        params: {
          id: Joi.string().required()
        },
        query: {
          target: Joi.string().required(),
          width: Joi.number().required(),
          dpr: Joi.number().optional(),
          background: Joi.string().optional(),
          padding: Joi.string().regex(/^$|^(([0-9.]+)(px|em|ex|%|in|cm|mm|pt|pc|vh|vw)?([ ])?){1,4}$/).optional(),
        }
      },
      tags: ['api']
    },
    handler: async (request, h) => {
      const targetKey = request.query.target;

      const target = request.server.settings.app.targets.get(`/`)
        .find(configuredTarget => {
          return configuredTarget.key === request.query.target
        })

      if (!target) {
        throw Boom.badRequest('no such target');
      }

      if (target.type !== 'web') {
        throw Boom.badRequest('the target is not of type web');
      }

      const response = await request.server.inject({
        url: `/rendering-info/${request.params.id}/${request.query.target}`
      });
      
      if (response.statusCode !== 200) {
        throw new Boom(response.statusMessage, { statusCode: response.statusCode } );
      }

      const server = response.request.server;
      const renderingInfo = JSON.parse(response.payload);

      let scripts = await server.methods.plugins.q.screenshot.getScripts(renderingInfo);
      let stylesheets = await server.methods.plugins.q.screenshot.getStylesheets(renderingInfo);

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
        padding: request.query.padding || '0',
        background: request.query.background
      }

      const screenshotBuffer = await getScreenshot(`${server.info.protocol}://localhost:${server.info.port}/screenshot/empty-page.html`, renderingInfo.markup, scripts, stylesheets, config);
      
      const imageResponse = h.response(screenshotBuffer);
      imageResponse.type('image/png');
      return imageResponse;
    }
  },
  {
    path: '/screenshot/empty-page.html',
    method: 'GET',
    handler: (request, h) => {
      return '<!DOCTYPE html><html><head></head><body></body></html>';
    }
  }
]
