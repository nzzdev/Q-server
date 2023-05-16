const Boom = require("@hapi/boom");
const Joi = require("../../../../helper/custom-joi.js");
const Ajv = require("ajv");
const ajv = new Ajv({ schemaId: "id" });
// add draft-04 support explicit
ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-04.json"));

function validateAgainstSchema(request, doc) {
  return new Promise(async (resolve, reject) => {
    const response = await request.server.inject(
      `/tools/${doc.tool}/schema.json`
    );
    if (response.statusCode !== 200) {
      reject(
        Boom.internal(`Error occured while fetching schema of tool ${doc.tool}`)
      );
    }

    const schema = JSON.parse(response.payload);

    const validate = ajv.compile(schema);
    if (validate(doc)) {
      resolve(true);
    } else {
      reject(
        Boom.badRequest(
          validate.errors
            .map((error) => {
              return JSON.stringify(error);
            })
            .join("\n")
        )
      );
    }
  });
}

module.exports = {
  get: {
    path: "/item/{id}",
    method: "GET",
    options: {
      auth: {
        strategies: ["q-auth-azure", "q-auth-ld"],
        mode: "optional",
      },
      cors: {
        credentials: true,
      },
      validate: {
        params: {
          id: Joi.string().required(),
        },
      },
      description: "gets the item with the given id from the database",
      tags: ["api", "editor"],
    },
    handler: async function (request, h) {
      return request.server.methods.db.item.getById({
        id: request.params.id,
        ignoreInactive: true,
        session: {
          credentials: request.auth.credentials,
          artifacts: request.auth.artifacts,
        },
      });
    },
  },
  post: {
    path: "/item",
    method: "POST",
    options: {
      validate: {
        payload: {
          _id: Joi.string().optional(),
          _rev: Joi.forbidden(),
          title: Joi.string().required(),
          tool: Joi.string().required(),
        },
        options: {
          allowUnknown: true,
        },
      },
      auth: {
        strategies: ["q-auth-azure", "q-auth-ld"],
      },
      cors: {
        credentials: true,
      },
      description:
        "stores a new item to the database and returns the id among other things",
      tags: ["api", "editor"],
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
      let docDiff = {};

      doc.createdDate = now.toISOString();
      docDiff.createdDate = doc.createdDate;
      doc.createdBy = request.auth.credentials.name;
      docDiff.createdBy = doc.createdBy;

      doc.updatedDate = now.toISOString();
      docDiff.updatedDate = doc.updatedDate;
      doc.updatedBy = request.auth.credentials.name;
      docDiff.updatedBy = doc.updatedBy;

      const res = await request.server.methods.db.item.insert({
        doc,
        session: {
          credentials: request.auth.credentials,
          artifacts: request.auth.artifacts,
        },
      });

      docDiff._id = res.id;
      docDiff._rev = res.rev;

      const savedDoc = Object.assign(doc, docDiff);
      request.server.events.emit("item.new", {
        newItem: savedDoc,
      });

      return docDiff;
    },
  },
  put: {
    path: "/item",
    method: "PUT",
    options: {
      validate: {
        payload: {
          _id: Joi.string().required(),
          _rev: Joi.string().required(),
          title: Joi.string().required(),
          tool: Joi.string().required(),
        },
        options: {
          allowUnknown: true,
        },
      },
      auth: {
        strategies: ["q-auth-azure", "q-auth-ld"],
      },
      cors: {
        credentials: true,
      },
      description:
        "updates an existing item to the database and returns the new revision number among other things",
      tags: ["api", "editor"],
    },
    handler: async function (request, h) {
      let doc = request.payload;
      let now = new Date();
      try {
        await validateAgainstSchema(request, doc);
      } catch (err) {
        throw Boom.badRequest(err);
      }

      // docDiff is used to store all the changed properties
      // to send them back to Q Editor for it to merge it with
      // the existing item state
      let docDiff = {};

      doc.updatedDate = now.toISOString();
      docDiff.updatedDate = doc.updatedDate;

      doc.updatedBy = request.auth.credentials.name;
      docDiff.updatedBy = doc.updatedBy;

      const oldDoc = await request.server.methods.db.item.getById({
        id: request.payload._id,
        ignoreInactive: true,
      });

      // if the active state change to true, we set activateDate
      let isNewActive = false;
      if (doc.active === true && oldDoc.active === false) {
        doc.activateDate = now.toISOString();
        docDiff.activateDate = doc.activateDate;
        isNewActive = true;
      }

      // if the active state change to false, we set activateDate
      let isNewInactive = false;
      if (doc.active === false && oldDoc.active === true) {
        doc.deactivateDate = now.toISOString();
        docDiff.deactivateDate = doc.deactivateDate;
        isNewInactive = true;
      }

      let isDeleted = false;
      if (doc._deleted === true) {
        isDeleted = true;
      }

      const res = await request.server.methods.db.item.insert({
        doc,
        session: {
          credentials: request.auth.credentials,
          artifacts: request.auth.artifacts,
        },
      });

      docDiff._rev = res.rev;
      const savedDoc = Object.assign(doc, docDiff);

      const eventData = {
        newItem: savedDoc,
        oldItem: oldDoc,
      };

      if (isNewActive) {
        request.server.events.emit("item.activate", eventData);
      }
      if (isNewInactive) {
        request.server.events.emit("item.deactivate", eventData);
      }
      if (isDeleted) {
        request.server.events.emit("item.delete", eventData);
      }

      request.server.events.emit("item.update", eventData);

      return docDiff;
    },
  },
};
