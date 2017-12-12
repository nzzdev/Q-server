const KeyCDN = require('keycdn');
const Hoek = require('hoek');

function getCacheTagForId(id) {
  return `q-item-id-${id}`;
}

module.exports = {
  name: 'q-cdn-keycdn',
  dependencies: ['q-base'],
  register: async function(server, options) {

    Hoek.assert(typeof options.zoneId === 'string', 'options.zoneId must be a string');
    Hoek.assert(typeof options.apiKey === 'string', 'options.apiKey must be a string');

    if (!options.xPullKey) {
      options.xPullKey = 'KeyCDN'; // this is the default at keycdn
    }

    server.ext('onPreResponse', async (request, h) => {
      const response = request.response;

      // if the request is not coming from keycdn: continue
      if (!request.headers.hasOwnProperty('x-pull') || request.headers['x-pull'] !== options.xPullKey) {
        return h.continue;
      }

      // if no cache-control header is present: continue
      if (!response.headers.hasOwnProperty('cache-control')) {
        return h.continue;
      }

      // if cache-control is set to no-cache: continue
      if (response.headers['cache-control'] === 'no-cache') {
        return h.continue;
      }

      // if there is no id property in the route params: continue
      if (!request.params.hasOwnProperty('id')) {
        return h.continue;
      }

      // if all prerequisites are given, actually add the cache-tag header
      return h.response(response)
        .header('cache-tag', getCacheTagForId(request.params.id))
    });

    const keycdn = new KeyCDN(options.apiKey);
    server.events.on('item.update', (item) => {
      const tagsToPurge = [
        getCacheTagForId(item._id),
      ];
      // dryRun is set for testing to not actually send the request to keycdn
      /* $lab:coverage:off$ */
      if (options.dryRun) {
        return;
      }
      keycdn.del(`zones/purgeurl/${options.zoneId}.json`, { tags: tagsToPurge }, (err, res) => {
        if (err) {
          server.log(['error'], err);
        } else {
          server.log(['info'], res);
        }
      });
      /* $lab:coverage:on$ */
    });
  }
};
