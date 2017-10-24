const Boom = require('boom');
const Joi = require('joi');

const getScreenshot = require('./helpers.js').getScreenshot;

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
          dpr: Joi.number().optional(),
          background: Joi.string().optional(),
          padding: Joi.string().regex(/^$|^(([0-9.]+)(px|em|ex|%|in|cm|mm|pt|pc|vh|vw)?([ ])?){1,4}$/).optional(),
        }
      },
      tags: ['api']
    },
    handler: (request, reply) => {
      const targetKey = request.query.target;

      const target = request.server.settings.app.targets.get(`/`)
        .find(configuredTarget => {
          return configuredTarget.key === request.query.target
        })

      if (!target) {
        return reply(Boom.badRequest('no such target'));
      }

      if (target.type !== 'web') {
        return reply(Boom.badRequest('the target is not of type web'));
      }

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
          let scripts = server.methods.plugins.screenshot.getScripts(renderingInfo);
          let stylesheets = server.methods.plugins.screenshot.getStylesheets(renderingInfo);

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
            dpr: request.query.dpr || 1,
            padding: request.query.padding || '0',
            background: request.query.background
          }

          const screenshotBuffer = await getScreenshot(`${server.info.protocol}://localhost:${server.info.port}/screenshot/empty-page.html`, renderingInfo.markup, scripts, stylesheets, config);
          
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
      reply('<!DOCTYPE html><html><head></head><body></body></html>');
    }
  }
]
