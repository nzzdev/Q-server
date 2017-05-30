const Joi = require('joi');
const Boom = require('boom');
const fetch = require('node-fetch');

function getDbUrl(server) {
  let dbUrl = server.settings.app.misc.get('/authStrategy/couchdb_cookie/db/host');
  if (!dbUrl) {
    dbUrl = server.settings.app.misc.get('/authStrategy/couchdb_cookie/couchdbHost');
  }

  if (!dbUrl.startsWith('http')) {
    dbUrl = `${server.settings.app.misc.get('/authStrategy/couchdb_cookie/db/protocol') || 'https'}://${dbUrl}`;
  }
  return dbUrl;
}

module.exports = [
  {
    path: '/authenticate',
    method: 'POST',
    config: {
      validate: {
        payload: {
          username: Joi.string().required(),
          password: Joi.string().required()
        }
      },
      cors: {
        credentials: true
      },
      tags: ['sensitive', 'auth', 'editor']
    },
    handler: (request, reply) => {
      request.auth.session.authenticate(request.payload.username, request.payload.password, (err, credentials) => {

        if (err) {
          return reply(err);
        }
        
        return reply({
          username: credentials.name
        });
      })
    }
  },
  {
    path: '/logout',
    method: 'POST',
    config: {
      auth: 'q-auth',
      cors: {
        credentials: true
      },
      tags: ['auth', 'editor']
    },
    handler: (request, reply) => {
      request.auth.session.clear()
      reply('');
    }
  },
  {
    path: '/user',
    method: 'GET',
    config: {
      auth: 'q-auth',
      cors: {
        credentials: true
      }
    },
    handler: (request, reply) => {
      const dbUrl = getDbUrl(request.server);
      fetch(`${dbUrl}/_users/org.couchdb.user:${request.auth.credentials.name}`, {
        headers: {
          'Cookie': `AuthSession=${request.state['AuthSession']};`
        }
      })
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw response
      })
      .then(data => {
        reply({
          username: request.auth.credentials.name,
          acronym: data.acronym,
          roles: data.roles,
          initials: data.initials,
          config: data.config,
          department: data.department,
        })
      })
      .catch(response => {
        reply(Boom.create(response.status, response.message))
      })
    }
  },
  {
    path: '/user',
    method: 'PUT',
    config: {
      auth: 'q-auth',
      cors: {
        credentials: true
      },
      validate: {
        payload: Joi.object()
      }
    },
    handler: (request, reply) => {
      const dbUrl = getDbUrl(request.server);
      fetch(`${dbUrl}/_users/org.couchdb.user:${request.auth.credentials.name}`, {
        headers: {
          'Cookie': `AuthSession=${request.state['AuthSession']};`
        }
      })
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw response
      })
      .catch(response => {
        reply(Boom.create(response.status, response.message))
      })
      .then(data => {
        let newUserData = Object.assign(data, request.payload);
        return fetch(`${dbUrl}/_users/org.couchdb.user:${request.auth.credentials.name}`, {
          method: 'PUT',
          headers: {
            'Cookie': `AuthSession=${request.state['AuthSession']};`
          },
          body: JSON.stringify(newUserData)
        })
      })
      .then(response => {
        if (response.ok) {
          return reply('ok')
        } else {
          return reply(Boom.internal());
        }
      })
    }
  }
]
