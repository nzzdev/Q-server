const getDb = require('../db.js').getDb;
const Boom = require('boom');
const Joi = require('joi');

module.exports = [
  {
    path: '/item/{id}',
    method: 'GET',
    handler: (request, reply) => {
      let db = getDb();
      db.get(request.params.id, (err, doc) => {
        if (err) {
          return reply(Boom.error(err.statusCode, err.description))
        }
        return reply(doc).type('application/json')
      })
    }
  },
  {
    path: '/item',
    method: 'POST',
    config: {
      validate: {
        // TODO: validate item against schema-new.json
        payload: {
          item: Joi.object().required(),
          token: Joi.string().required()
        }
      }
    },
    handler: (request, reply) => {
      // TODO: validate the token
      let db = getDb();
      db.insert(request.payload, (err, doc) => {
        if (err) {
          return reply(Boom.create(err.statusCode, err.description))
        }
        return reply(doc).type('application/json')
      })
    }
  },
  {
    path: '/item',
    method: 'PUT',
    config: {
      validate: {
        // TODO: validate item against schema-existing.json
        payload: {
          item: Joi.object().required(),
          token: Joi.string().required()
        }
      }
    },
    handler: (request, reply) => {
      let db = getDb();
      // TODO: set the updated date
      // TODO: validate the token
      db.insert(request.payload, (err, doc) => {
        if (err) {
          return reply(Boom.create(err.statusCode, err.description))
        }
        return reply(doc).type('application/json')
      })
    }
  }
]
