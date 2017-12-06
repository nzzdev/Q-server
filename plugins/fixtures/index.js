const Boom = require('boom');
const Hoek = require('hoek');
const fetch = require('node-fetch');

module.exports = {
  name: 'q-fixtures',
  dependencies: 'q-base',
  register: async function (server, options) {
    Hoek.assert(server.settings.app.tools && typeof server.settings.app.tools.get === 'function', new Error('server.settings.app.tools.get needs to be a function')); 

    // get a list of already existing (stored in db) and new fixture data
    server.method('fixtures.get', async () => {
      const tools = server.settings.app.tools.get('');
      let fixtures = {
        existing: [],
        new: []
      };
      for (const tool of Object.keys(tools)) {
        // fetch fixture data of configured tools
        const response = await server.inject({
          url: `/tools/${tool}/fixtures/data`
        });
        // all other status codes will be ignored, 
        // e.g. 502 - tool is not running or
        // 404 - tool has no fixture data endpoint 
        if (response.statusCode === 200) {
          const toolFixtureData = JSON.parse(response.payload);
          for (const [index, item] of toolFixtureData.entries()) {
            item._id = `${tool}-${index}`;
            item.tool = tool;
            item.active = true;
            // check if fixture data with id already exists
            const response = await server.inject({
              url: `/item/${item._id}`
            });
            if (response.statusCode === 200) {
              const origItem = JSON.parse(response.payload);
              item._rev = origItem._rev;
              fixtures.existing.push(item);
            } else if (response.statusCode === 404) {
              item.activateDate = new Date().toISOString();
              fixtures.new.push(item);
            }
          }
        }
      }
      return fixtures;
    })

    server.route([
      require('./routes.js').storeFixtures,
      require('./routes.js').getExistingFixtureIds
    ])
  }
}

