const nano = require("nano");
const Boom = require("boom");

function getSearchFilters(filterProperties) {
  return Object.keys(filterProperties).map(parameterName => {
    const parameterValue = filterProperties[parameterName];
    if (parameterName === "searchString") {
      const searchFields = ["id", "title", "subtitle", "annotations"];
      return {
        $or: searchFields.map(searchField => {
          const searchStringFilter = {};
          searchStringFilter[searchField] = {
            $regex: parameterValue + "*"
          };
          return searchStringFilter;
        })
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

    server.method("db.item.getById", function(id, ignoreInactive = false) {
      return new Promise((resolve, reject) => {
        server.app.db.get(id, (err, item) => {
          if (err) {
            return reject(
              new Boom(err.description, { statusCode: err.statusCode })
            );
          }

          if (!ignoreInactive && item.active !== true) {
            return reject(Boom.forbidden("Item is not active"));
          }
          return resolve(item);
        });
      });
    });

    server.method("db.item.getAllByTool", function(tool) {
      const options = {
        keys: [tool],
        include_docs: true,
        reduce: false
      };
      return new Promise((resolve, reject) => {
        server.app.db.view("items", "byTool", options, async (err, data) => {
          if (err) {
            return reject(Boom.internal(err));
          } else {
            const items = data.rows.map(item => {
              return item.doc;
            });
            return resolve(items);
          }
        });
      });
    });

    server.method("db.item.search", function(
      filterProperties,
      limit,
      bookmark
    ) {
      return new Promise((resolve, reject) => {
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

        server.app.db.server.request(requestOptions, (err, data) => {
          if (err) {
            return reject(Boom.internal(err));
          } else {
            return resolve(data);
          }
        });
      });
    });
  }
};
