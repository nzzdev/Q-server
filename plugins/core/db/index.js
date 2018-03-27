const nano = require("nano");
const Boom = require("boom");

function getSearchFilters(queryParameters) {
  // Remove query parameters which are not used in filters
  delete queryParameters.limit;
  delete queryParameters.bookmark;
  return Object.keys(queryParameters).map(parameterName => {
    const parameterValue = queryParameters[parameterName];
    if (parameterName === "searchString") {
      const searchFields = ["id", "title", "subtitle", "annotations"];
      const filter = {
        $or: []
      };
      for (const searchField of searchFields) {
        const searchStringFilter = {};
        searchStringFilter[searchField] = {
          $regex: parameterValue + "*"
        };
        filter.$or.push(searchStringFilter);
      }
      return filter;
    }
    if (parameterName === "tool" && Array.isArray(parameterValue)) {
      const filter = {
        $or: []
      };
      for (const tool of parameterValue) {
        const toolFilter = {
          tool: {
            $eq: tool
          }
        };
        filter.$or.push(toolFilter);
      }
      return filter;
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

    server.method("db.item.search", function(queryParameters) {
      return new Promise((resolve, reject) => {
        const requestOptions = {
          db: options.database,
          path: "_find",
          method: "POST",
          body: {
            selector: {
              $and: getSearchFilters(queryParameters)
            },
            sort: [
              {
                updatedDate: "desc"
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
