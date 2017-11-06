const Boom = require('boom');
const Joi = require('joi');
const Ajv = require('ajv');
const ajv = new Ajv();
// add draft-04 support explicit
ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));

function validateAgainstSchema(request, doc) {
  return new Promise((resolve, reject) => {
    request.server.inject(`/tools/${doc.tool}/schema.json`, (response) => {
      if (response.statusCode !== 200) {
        reject(Boom.internal(`Error occured while fetching schema of tool ${doc.tool}`));
      }

      const schema = JSON.parse(response.payload);

      const validate = ajv.compile(schema);
      if (validate(doc)) {
        resolve(true);
      } else {
        reject(Boom.badRequest(JSON.stringify(validate.errors)));
      }
    });
  });
}

module.exports = {
  get: {
    path: '/item/{id}',
    method: 'GET',
    options: {
      validate: {
        params: {
          id: Joi.string().required(),
        }
      },
      description: 'gets the item with the given id from the database',
      tags: ['api', 'editor']
    },
    handler: async function (request, h) {
      return request.server.methods.item.getById(request.params.id);
    }
  },
  post: {
    path: '/item',
    method: 'POST',
    options: {
      validate: {
        payload: {
          _id: Joi.forbidden(),
          _rev: Joi.forbidden(),
          title: Joi.string().required(),
          tool: Joi.string().required()
        },
        options: {
          allowUnknown: true
        }
      },
      auth: 'q-auth',
      cors: {
        credentials: true
      },
      description: 'stores a new item to the database and returns the id among other things',
      tags: ['api', 'editor']
    },
    handler: async function (request, h) {
      let doc = request.payload;
      let now = new Date();

      try {
        await validateAgainstSchema(request, doc);
      } catch (err) {
        return err;
      }

      // docDiff is used to store all the changed properties
      // to send them back to Q Editor for it to merge it with
      // the existing item state
      let docDiff = {}

      doc.createdDate = now.toISOString();
      docDiff.createdDate = doc.createdDate;
      doc.createdBy = request.auth.credentials.name;
      docDiff.createdBy = doc.createdBy;

      return new Promise((resolve, reject) => {
        request.server.app.db.insert(request.payload, (err, res) => {
          if (err) {
            return reject(Boom.create(err.statusCode, err.description));
          }
  
          docDiff._id = res.id;
          docDiff._rev = res.rev;
  
          return resolve(docDiff);
        })
      });
    }
  },
  put: {
    path: '/item',
    method: 'PUT',
    options: {
      validate: {
        payload: {
          _id: Joi.string().required(),
          _rev: Joi.string().required(),
          title: Joi.string().required(),
          tool: Joi.string().required()
        },
        options: {
          allowUnknown: true
        }
      },
      auth: 'q-auth',
      cors: {
        credentials: true
      },
      description: 'updates an existing item to the database and returns the new revision number among other things',
      tags: ['api', 'editor']
    },
    handler: async function (request, h) {
      let doc = request.payload;
      let now = new Date();

      try {
        await validateAgainstSchema(request, doc);
      } catch (e) {
        return reply(e)
      }

      // docDiff is used to store all the changed properties
      // to send them back to Q Editor for it to merge it with
      // the existing item state
      let docDiff = {}

      doc.updatedDate = now.toISOString();
      doc.updatedBy = request.auth.credentials.name;

      const oldDoc = await request.server.methods.item.getById(request.payload._id);

      // if the active state change to true, we set activateDate
      if (doc.active === true && oldDoc.active === false) {
        doc.activateDate = now.toISOString();
        docDiff.activateDate = doc.activateDate;
      }

      // if the active state change to false, we set activateDate
      if (doc.active === false && oldDoc.active === true) {
        doc.deactivateDate = now.toISOString();
        docDiff.deactivateDate = doc.deactivateDate;
      }

      return new Promise((resolve, reject) => {
        db.insert(doc, (err, res) => {
          if (err) {
            return reject(Boom.create(err.statusCode, err.description))
          }

          docDiff._rev = res.rev;

          return resolve(docDiff);
        })
      });
    }
  }
};
