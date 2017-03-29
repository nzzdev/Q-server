const Boom = require('boom');
const fetch = require('node-fetch');
const getDb = require('../../db.js').getDb;
const server = require('../../server').getServer();

const db = getDb();
const statusUpdated = 'updated';
const statusNotUpdated = 'not updated';
const statusFailed = 'failed';


module.exports = {
  path: '/admin/migration/{tool}/{id?}',
  method: 'GET',
  config: {      
    auth: 'q-auth',
    cors: {
      credentials: true
    },
    description: 'Executes migration of items in database for specified tool or for a single item with the specified id respectively',
    tags: ['api']
  },
  handler: (request, reply) => {
    const tool = request.params.tool;

    if (!server.settings.app.tools.get(`/${tool}/baseUrl`)) {
      return reply(Boom.notImplemented(`no base url configuration for ${tool} found`));
    }

    const options = {
        keys: [tool],
        include_docs: true,
        reduce: false
    };

    if (request.params.id) {

      db.get(request.params.id, async(err, item) => {
        if (err) {
          return reply(Boom.create(err.statusCode, err.description));
        }
        let migrationStatus = await migrateItem(item, tool);
        return reply({
          status: migrationStatus.status
        }).type('application/json');
      });

    } else {
      
      db.view('items', 'byTool', options, async(err, data) => {
        if (err) {
          return reply(Boom.create(err.statusCode, err.description));
        }

        const items = data.rows.map(item => {
          return item.doc;
        });
        
        let migrationStatuses = items.map(async item => {
          return await migrateItem(item, tool);
        })

        migrationStatuses = await Promise.all(migrationStatuses);

        const stats = migrationStatuses.reduce((groupedStats, migrationStatus) => {
          const status = migrationStatus.status;
          if(!groupedStats[status]) {
            groupedStats[status] = [];
          }
          groupedStats[status].push(migrationStatus.id);
          return groupedStats;
        }, {});

        return reply(stats).type('application/json');
      });

    }
  }
}

function migrateItem(item, tool) {
  return new Promise(async (resolve, reject) => {
    const baseUrl = server.settings.app.tools.get(`/${tool}/baseUrl`);
    const body = {
      item: item
    }

    try {
      const response = await fetch(`${baseUrl}/migration`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 200) {
        const json = await response.json();
        await saveItem(json.item);
        return resolve({
          id: item._id,
          status: statusUpdated
        }); 
      }

      if (response.status === 304) {
        return resolve({
          id: item._id,
          status: statusNotUpdated
        });
      }

      throw new Error(`item ${item._id} could not be migrated`);

    } catch (e) {
      server.log(['error'], e);
      resolve({
        id: item._id,
        status: statusFailed
      });
    }
  });
}

function saveItem(item) {
  return new Promise((resolve, reject) => {
    db.insert(item, (err, res) => {
      if (err) {
        reject(err);
      }
    });
    resolve(item);
  });
}
