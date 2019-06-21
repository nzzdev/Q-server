---
title: Installation
---

## Setup CouchDB

1. Get [CouchDB](https://couchdb.apache.org) up an running. At NZZ we use [Cloudant on IBM Bluemix](https://console.ng.bluemix.net/catalog/services/cloudant-nosql-db). But there are other providers or you can host it yourself. You have to get a little bit familiar with CouchDB.
2. Create a new database to hold all the _item_ documents. Lets call it _items-db_ for now.
3. Implement an authentication scheme: q-server version >3 does not implement an authentication scheme, instead you need to configure a hapi auth scheme called q-auth on your own. At NZZ, we use a scheme letting users log in using the same credentials as the CMS, but you can also use https://github.com/ubilabs/hapi-auth-couchdb-cookie (if updated to support hapi 17) or some other hapi auth plugin or even roll your own. How exactly this works is out of scope for this howto, please find information in the hapi documentation: https://hapijs.com/api
4. Add these design documents to your couchdb

```json
{
  "_id": "_design/items",
  "views": {
    "numberOfItems": {
      "map": "function(doc) {\n  if (doc.active && doc.createdDate && doc.department) {\n    var d = new Date(doc.createdDate);\n    emit(d.valueOf(), 1);\n  }\n}",
      "reduce": "_sum"
    },
    "numberOfItemsPerDay": {
      "map": "function(doc) {\n  if (doc.active && doc.createdDate && doc.department) {\n    var d = new Date(doc.createdDate);\n    var year = d.getFullYear();\n    var month = d.getMonth() + 1;\n    if (month < 10) {\n      month = '0' + month;\n    }\n    var day = d.getDate();\n    if (day < 10) {\n      day = '0' + day;\n    }\n    emit('' + year + month + day, 1);\n  }\n}",
      "reduce": "_count"
    },
    "byTool": {
      "map": "function (doc) {\n  if (doc.tool) {\n    emit(doc.tool, doc._id);\n  }\n}",
      "reduce": "_count"
    }
  }
}
```

```json
{
  "_id": "_design/tools",
  "views": {
    "usagePerUser": {
      "reduce": "_sum",
      "map": "function (doc) {\n  if (doc.tool && doc.createdBy) {\n    emit([doc.createdBy, doc.tool], 1);\n  }\n  if (doc.tool && doc.updatedBy) {\n    emit([doc.updatedBy, doc.tool], 1);\n  }\n}"
    }
  },
  "language": "javascript"
}
```

```json
{
  "_id": "_design/query-index",
  "language": "query",
  "views": {
    "search-simple-index": {
      "map": {
        "fields": {
          "updatedDate": "desc"
        },
        "partial_filter_selector": {}
      },
      "reduce": "_count",
      "options": {
        "def": {
          "fields": [
            {
              "updatedDate": "desc"
            }
          ]
        }
      }
    }
  }
}
```

## Setup Q server

Q server comes as an npm package that you will add as a dependency to your own project. All the configuration will be done in code in your specific Q server implementation. As a start you can use `Q` cli to bootstrap a new Q server implementation.

1. run `npm install -g @nzz/q-cli` to install the `Q` cli
2. run `Q new-server my-server-name` to bootstrap a new Q server implementation. Replace `my-server-name` with the actual name of your Q server. See [Q cli](https://github.com/nzzdev/Q-cli/tree/master#creating-new-q-server-implementation) for further details.
3. edit all the configuration files in `config/` and adjust to your needs
4. adjust authorization strategy in `auth/` according to your needs. As a start, the same authorization strategy is implemented as on our [demo instance](https://editor.q.tools), giving user names `demo-user`, `demo-expert` and `demo-poweruser` access with any password.
5. set the environment variables `COUCH_HOST`, `COUCH_DB`, `COUCH_USER` and `COUCH_PASS` to a host/db/user/pass combination that has write permissions to your _items-db_ and start the Q server with

```bash
COUCH_HOST=host COUCH_DB=db COUCH_USER=user COUCH_PASS=pass node index.js
```

## Setup Q editor

Now you probably want to [deploy your Q editor](https://github.com/nzzdev/Q-editor#deployment) to connect it to your Q server.
