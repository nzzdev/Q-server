const Boom = require("@hapi/boom");
const Bounce = require("@hapi/bounce");
const fetch = require("node-fetch");

const statusUpdated = "updated";
const statusNotUpdated = "not updated";
const statusFailed = "failed";

module.exports = {
  path: "/admin/migration/{tool}/{id?}",
  method: "GET",
  config: {
    auth: "q-auth",
    cors: {
      credentials: true
    },
    description:
      "Executes migration of items in database for specified tool or for a single item with the specified id respectively",
    tags: ["api"]
  },
  handler: async (request, h) => {
    const tool = request.params.tool;
    let toolBaseUrl = request.server.settings.app.tools.get(`/${tool}/baseUrl`);

    if (!toolBaseUrl) {
      return Boom.notImplemented(`no base url configuration for ${tool} found`);
    }

    if (request.params.id) {
      const ignoreInactive = true;
      try {
        const item = await request.server.methods.db.item.getById(
          request.params.id,
          ignoreInactive
        );
        const migrationStatus = await migrateItem(
          item,
          toolBaseUrl,
          request.server.app.db
        );
        return {
          status: migrationStatus.status
        };
      } catch (err) {
        Bounce.rethrow(err, "system");
        return err;
      }
    } else {
      const items = await request.server.methods.db.item.getAllByTool(tool);

      let migrationStatuses = items.map(async item => {
        return await migrateItem(item, toolBaseUrl, request.server.app.db);
      });

      migrationStatuses = await Promise.all(migrationStatuses);

      const stats = migrationStatuses.reduce(
        (groupedStats, migrationStatus) => {
          const status = migrationStatus.status;
          if (!groupedStats[status]) {
            groupedStats[status] = [];
          }
          groupedStats[status].push(migrationStatus.id);
          return groupedStats;
        },
        {}
      );

      return stats;
    }
  }
};

function migrateItem(item, toolBaseUrl, db) {
  return new Promise(async (resolve, reject) => {
    const body = {
      item: item
    };

    try {
      const response = await fetch(`${toolBaseUrl}/migration`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (response.status === 200) {
        const json = await response.json();
        await saveItem(json.item, db);
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
      resolve({
        id: item._id,
        status: statusFailed
      });
    }
  });
}

function saveItem(item, db) {
  return new Promise((resolve, reject) => {
    db.insert(item, (err, res) => {
      if (err) {
        reject(err);
      }
    });
    resolve(item);
  });
}
