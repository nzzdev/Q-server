const nano = require("nano");
const Boom = require("@hapi/boom");

function getSearchFilters(filterProperties) {
  return Object.keys(filterProperties).map(parameterName => {
    const parameterValue = filterProperties[parameterName];
    if (parameterName === "searchString") {
      const searchFields = ["_id", "title", "subtitle", "annotations"];
      return {
        $or: searchFields.map(searchField => {
          const searchStringFilter = {};
          searchStringFilter[searchField] = {
            $regex: `(?i)${parameterValue}`
          };
          return searchStringFilter;
        })
      };
    }
    if (parameterName === "active" && parameterValue === false) {
      return {
        $or: [
          {
            active: {
              $eq: false
            }
          },
          {
            active: {
              $exists: false
            }
          }
        ]
      };
    }
    if (parameterName === "createdBy") {
      return {
        $or: [
          {
            createdBy: {
              $eq: parameterValue
            }
          },
          {
            updatedBy: {
              $eq: parameterValue
            }
          }
        ]
      };
    }
    if (parameterName === "tool" && Array.isArray(parameterValue)) {
      return {
        $or: parameterValue.map(tool => {
          return {
            tool: {
              $eq: tool
            }
          };
        })
      };
    }
    const filter = {};
    filter[parameterName] = {
      $eq: parameterValue
    };
    return filter;
  });
}

module.exports = {
  name: "q-db",
  register: async function(server, options) {
    const dbUrl = `${options.protocol || "https"}://${options.host}/${
      options.database
    }`;
    server.log(["info"], `Connecting to database ${dbUrl}`);

    const nanoConfig = {
      url: dbUrl
    };

    if (options.user && options.pass) {
      nanoConfig.requestDefaults = {
        auth: {
          user: options.user,
          pass: options.pass
        }
      };
    }

    server.app.db = nano(nanoConfig);
    server.method("db.item.getById", async function({
      id,
      ignoreInactive,
      session
    }) {
      const item = await server.app.db.get(id);
      if (!ignoreInactive && item.active !== true) {
        throw new Boom.forbidden("Item is not active");
      }
      return item;
    });

    // the session property passed here is
    server.method("db.item.insert", async function({ doc, session }) {
      const res = await server.app.db.insert(doc);
      if (!res.ok) {
        throw new Error("failed to insert doc");
      }
      return {
        id: res.id,
        rev: res.rev
      };
    });

    server.method("db.item.getAllByTool", async function({ tool, session }) {
      const options = {
        keys: [tool],
        include_docs: true,
        reduce: false
      };
      const res = await server.app.db.view("items", "byTool", options);
      if (!res.ok) {
        throw new Error(`failed to getAllByTool ${tool}`);
      }
      const items = res.rows.map(item => {
        return item.doc;
      });
      return items;
    });

    server.method("db.item.search", async function({
      filterProperties,
      limit,
      bookmark,
      session
    }) {
      const requestOptions = {
        db: options.database,
        path: "_find",
        method: "POST",
        body: {
          selector: {
            $and: getSearchFilters(filterProperties)
          },
          sort: [
            {
              updatedDate: "desc"
            }
          ],
          limit: limit || 18,
          bookmark: bookmark || null
        }
      };

      const res = await server.app.db.server.request(requestOptions);
      if (!res.docs) {
        throw new Error(`failed to search`);
      }
      return res;
    });

    server.method("db.statistics.getNumberOfItems", async function({
      since,
      session
    }) {
      const options = {
        reduce: "true"
      };

      if (!Number.isNaN(since)) {
        options.startkey = since;
      }

      const res = await server.app.db.view("items", "numberOfItems", options);
      try {
        return res.rows[0].value; // this returns the exact number of items in the database
      } catch (e) {
        return 0;
      }
    });

    server.method("db.tools.getWithUserUsage", function({ username }) {
      const options = {
        startkey: [username],
        endkey: [username, {}],
        reduce: true,
        group: true
      };
      return new Promise((resolve, reject) => {
        server.app.db.view(
          "tools",
          "usagePerUser",
          options,
          async (err, data) => {
            if (err) {
              return reject(Boom.internal(err));
            } else {
              const toolsWithUsage = data.rows.map(row => {
                return {
                  tool: row.key[1],
                  usage: row.value
                };
              });
              return resolve(toolsWithUsage);
            }
          }
        );
      });
    });
  }
};
