const nano = require('nano');

module.exports = {
  name: 'q-db',
  register: async function (server, options) {
    const dbUrl = `${options.protocol || 'https'}://${options.host}/${options.database}`;
    server.log(['info'], `Connecting to database ${dbUrl}`);
    server.app.db = nano({
      url: dbUrl,
      requestDefaults: {
        auth: {
          user: options.user,
          pass: options.pass
        }
      }
    });

    server.method('db.item.getById', async function(id, ignoreInactive = false) {
      return new Promise((resolve, reject) => {
        server.app.db.get(id, (err, item) => {
          if (err) {
            return reject(Boom.create(err.statusCode, err.description));
          }
      
          if (!ignoreInactive && item.active !== true) {
            return reject(Boom.forbidden('Item is not active'));
          }
          return resolve(item);
        })
      });
    });

    server.method('db.item.search', async function(payload) {
      return new Promise((resolve, reject) => {
        server.app.db.search('items', 'search', payload, (err, data) => {
          if (err) {
            return reject(Boom.internal(err));
          } else {
            return resolve(data);
          }
        })
      });
    });



  }
};
