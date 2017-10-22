const Boom = require('boom');
const Joi = require('joi');

const screenshot = require('../features/screenshot.js');

module.exports = [
  {
    path: '/screenshot/{id}.png',
    method: 'GET',
    config: {
      validate: {
        params: {
          id: Joi.string().required()
        },
        query: {
          target: Joi.string().required(),
          width: Joi.number().required(),
          dpr: Joi.number().optional()
        }
      },
      tags: ['api']
    },
    handler: (request, reply) => {
      if (request.server.settings.app.targets.get(`/${request.query.target}`)) {
        return reply(Boom.badRequest('no such target'));
      }

      const targetKey = request.query.target;

      request.server.inject({
        url: `/rendering-info/${request.params.id}/${request.query.target}`
      }, async (response) => {
        if (response.statusCode !== 200) {
          const err = Boom.create(response.statusCode);
          return reply(err);
        }

        const server = response.request.server;
        const renderingInfo = JSON.parse(response.payload);
        try {
          let scripts = server.methods.screenshot.getScripts(renderingInfo);
          let stylesheets = server.methods.screenshot.getStylesheets(renderingInfo);

          const target = server.settings.app.targets.get('').find(element => {
            return element.key === targetKey;
          });

          // add scripts and stylesheets from publication config
          if (Array.isArray(target.context.scripts)) {
            scripts = target.scripts.context.concat(scripts);
          }
          if (Array.isArray(target.context.stylesheets)) {
            stylesheets = target.context.stylesheets.concat(stylesheets);
          }

          const config = {
            width: request.query.width,
            dpr: request.query.dpr || 1
          }

          const screenshotBuffer = await screenshot.getScreenshot(`${server.info.protocol}://localhost:${server.info.port}/screenshot/empty-page.html`, renderingInfo.markup, scripts, stylesheets, config);
          
          return reply(screenshotBuffer)
            .type('image/png');
        } catch (e) {
          server.log(['error'], e);
          return reply(Boom.internal());
        }
      })
    }
  },
  {
    path: '/screenshot/empty-page.html',
    method: 'GET',
    handler: (request, reply) => {
      reply('<!DOCTYPE html><html><head></head><body style="margin: 0;"></body></html>');
    }
  }
]
