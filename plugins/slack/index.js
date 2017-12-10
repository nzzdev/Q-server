const Hoek = require('hoek');
const sendItemUpdate = require('./helpers.js').sendItemUpdate;
const getSlashCommandRoutes = require('./slash-command-routes.js').getRoutes;

module.exports = {
  name: 'q-slack',
  dependencies: ['q-base'],
  register: async function(server, options) {
    Hoek.assert(typeof options.token === 'string', 'options.token must be a string');
    Hoek.assert(typeof options.slashCommandToken === 'string', 'options.slashCommandToken must be a string');

    server.route(getSlashCommandRoutes(options));

    const WebClient = require('@slack/client').WebClient;
    const slackWebClient = new WebClient(options.token);

    // setup event listeners
    if (Array.isArray(options.notifications)) {
      for (const notification of options.notifications) {
        for (const event of notification.events) {

          server.events.on(event, async (eventPayload) => {
            let shouldHandleEvent = true;
            // only handle the event if all propertyFilters match
            for (const property in notification.propertyFilters) {
              if (eventPayload[property] !== notification.propertyFilters[property] ) {
                shouldHandleEvent = false;
              }
            }
            if (shouldHandleEvent && (event === 'item.new' || event === 'item.update')) {
              const itemUpdateOptions = {
                channel: notification.channel,
                qEditorBaseUrl: options.qEditorBaseUrl,
                postScreenshots: options.postScreenshots
              };
              sendItemUpdate(event, slackWebClient, eventPayload, itemUpdateOptions, server);
            }
          });

        }
      }
    }
  }
};
