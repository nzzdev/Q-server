const nano = require("nano");
const Boom = require("boom");

function getFilters(queryParameters) {
  let filters = [];
  for (let parameter in queryParameters) {
    if (
      queryParameters[parameter] &&
      parameter !== "searchString" &&
      parameter !== "bookmark" &&
      parameter !== "limit"
    ) {
      let fieldFilter = {};
      fieldFilter[parameter] = {
        $eq: queryParameters[parameter]
      };
      filters.push(fieldFilter);
    } else if (queryParameters[parameter] && parameter === "searchString") {
      const searchFields = ["id", "title", "subtitle", "annotations"];
      let searchFieldFilter = {
        $or: []
      };
      for (let searchField of searchFields) {
        let searchStringFilter = {};
        searchStringFilter[searchField] = {
          $regex: queryParameters[parameter] + "*"
        };
        searchFieldFilter.$or.push(searchStringFilter);
      }
      filters.push(searchFieldFilter);
    }
  }
  return filters;
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

    server.method("db.item.search", function(payload) {
      return new Promise((resolve, reject) => {
        server.app.db.search("items", "search", payload, (err, data) => {
          if (err) {
            return reject(Boom.internal(err));
          } else {
            return resolve(data);
          }
        });
      });
    });

    server.method("db.item.newSearch", function(queryParameters) {
      return new Promise((resolve, reject) => {
        const selector = {
          $and: getFilters(queryParameters)
        };

        const requestOptions = {
          db: options.database,
          path: "_find",
          method: "POST",
          body: {
            selector: selector,
            sort: [
              {
                updatedDate: "desc"
              },
              {
                createdDate: "desc"
              }
            ],
            limit: queryParameters.limit || 18,
            bookmark: queryParameters.bookmark || null
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
