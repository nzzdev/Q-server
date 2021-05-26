---
title: Migrations
---

At some point you may need to implement breaking changes in your tool specific schema. Breaking means that older Q items may not validate anymore against the new schema. Hence, you'll need to migrate your old Q items in your database.
Q server contains an endpoint for that purpose. To be able to use this endpoint you have to

- add a view to your respective Q item database(s)
- add an endpoint in that tool for which Q items have to be migrated and add necessary migration scripts accordingly

## Q server migration endpoint

- **GET** _/admin/migration/{tool}/{id?}_: Endpoint to migrate all Q items of the specified `tool` or, if the `id` is given, a single item with that id. The reponse contains all item ids aggregated by their migration statuses `updated`, `not updated` and `failed`. For each item the migration endpoint of the respective tool is called which responds with either the changed item or with a `Not modified`. If an item was changed Q server will save the updated item in the database.

## Database view

The migration endpoint in Q server expects a specific view called `byTool` which you have to add to your Q item database(s):

```json
{
  "_id": "_design/items",
  "views": {
    "byTool": {
      "map": "function (doc) {\n  if (doc.tool) {\n    emit(doc.tool, 1);\n  }\n}",
      "reduce": "_count"
    }
  }
}
```

Q server uses this view without the reduce option. See also [Installation](install.html) to get an overview of all views you should define on your Q item database(s).

## Migration mechanism in tools

### Endpoint

You have to define the following endpoint if you want to be able to migrate items via Q server:

- **POST** _/migration_: The item will be POSTed to that endpoint and the handler method runs all necessary scripts for the respective version of your tool on that item and returns either the modified item or a `Not modified` if the item was not affected by the change.

  One example of one of our election tools:

  ```javascript
  const Joi = require("joi");
  const Boom = require("boom");

  // register migration scripts here in order of version,
  // i.e. list the smallest version first
  const migrationScripts = [require("../migration-scripts/to-v2.0.0.js")];

  module.exports = {
    method: "POST",
    path: "/migration",
    options: {
      validate: {
        payload: {
          item: Joi.object().required(),
        },
      },
    },
    handler: async (request, h) => {
      let item = request.payload.item;
      const results = migrationScripts.map((script) => {
        const result = script.migrate(item);
        if (result.isChanged) {
          item = result.item;
        }
        return result;
      });
      const isChanged = results.findIndex((result) => {
        return result.isChanged;
      });
      if (isChanged >= 0) {
        return {
          item: item,
        };
      }
      return h.response().code(304);
    },
  };
  ```

  We simply execute all migration modules, that's why it's important that migration modules are ordered by version.

### Migration scripts

We create one migration module for each major, i.e. breaking, version of the tool and name it after the version we want to release, e.g. `to-v2.0.0.js`. Each module exports one `migrate` function. Of course it can contain several methods with different migration conditions.

In the following example you see one migration module with just one method. Since we made the party name required in the schema of Q election votes tool in version v2.0.0, an item will only be migrated if it has a party without having a name. The return value is a result object containing the item (modified or not) and a `isChanged` flag which is used by the handler method of the migration endpoint to reply with the appropriate response.

```javascript
// contains all scripts which shall be executed to migrate to tool version 2.0.0
// each module has to return a result object holding the modified item and a
// flag property indicating if item was changed or not
module.exports.migrate = function (item) {
  let result = {
    isChanged: false,
  };
  if (item.parties) {
    let truthyparties = item.parties.filter((party) => {
      return party.name !== undefined && party.name !== "";
    });
    if (truthyparties.length < item.parties.length) {
      item.parties = truthyparties;
      result.isChanged = true;
    }
  }
  result.item = item;
  return result;
};
```

### Tests

We recommend to include a migration mechanism in your tests, too, that will check whether items are migrated correctly and whether the validation against the new schema results in no errors after migration.
For that purpose

- we also versioned our mock data.
- we test the rendering info endpoint with new schema like mock data
- we test the migration endpoint with new schema like mock data and expect to get a `Not modified` as a response
- we test the migration endpoint with old schema like mock data and expect to get a modified item as a response
  See e.g. the test folder of [Q election votes](https://github.com/nzzdev/Q-election-votes/tree/master/test) for details.
