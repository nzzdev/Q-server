---
title: Installation
---

## Setup CouchDB
1. Get [CouchDB](https://couchdb.apache.org) up an running. At NZZ we use [Cloudant on IBM Bluemix](https://console.ng.bluemix.net/catalog/services/cloudant-nosql-db). But there are other providers or you can host it yourself. You have to get a little bit familiar with CouchDB.
2. Create a new database to hold all the _item_ documents. Lets call it _items-db_ for now.
3. Implement an authentication scheme: q-server > 3 does not implement a authentication scheme on its own but you need to configure a hapi auth scheme called `q-auth` on your own. At NZZ, we use a scheme letting users log in using the same credentials as the CMS, but you can also use https://github.com/ubilabs/hapi-auth-couchdb-cookie (if updated to support hapi 17) or some other hapi auth plugin or roll even roll your own. How exactly this works is out of scope for this howto, please find information in the hapi documentation: https://hapijs.com/api
4. Add this document as _items-db/_design/items_ to get the neccessary views in place
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
  },
  "indexes": {
    "search": {
      "analyzer": "standard",
      "index": "function (doc) {\n  if (doc._id.indexOf('_design/') === 0) {\n    return;\n  }\n  index(\"id\", doc._id);\n  if (doc.title) {\n    index(\"title\", doc.title);\n  }\n  if (doc.annotations) {\n    index(\"annotations\", doc.annotations);\n  }\n  if (doc.createdBy) {\n    index(\"createdBy\", doc.createdBy);\n  }\n  if (doc.department) {\n    index(\"department\", doc.department);\n  }\n  if (doc.tool) {\n    index(\"tool\", doc.tool)\n  }\n  if (doc.active !== undefined) {\n    index(\"active\", doc.active);\n  } else {\n    index(\"active\", false);\n  }\n  if (doc.updatedDate || doc.createdDate) {\n    var date;\n    if (doc.updatedDate) {\n      date = new Date(doc.updatedDate);\n    } else if (doc.createdDate) {\n      date = new Date(doc.createdDate);\n    }\n    if (date) {\n      index(\"orderDate\", date.valueOf());\n    }\n  }\n}"
    }
  }
}
```

## Setup Q server
Q server will run as a node service. At NZZ we use Docker to deploy it, but there are a lot of other solutions available. Q server comes as an npm package that you will add as a dependency to your own project. All the configuration will be done in code. In this tutorial we will use Q server demo implementation as base.
1. Clone or download [Q server demo](https://github.com/nzzdev/Q-server-demo)
2. We use [Confidence](https://github.com/hapijs/confidence) for configuration of different environments. Have a look at some examples to get yourself familiar with the format.
3. edit all the configuration files in `config/` and adjust to your needs
7. set the environment variables `COUCH_HOST`, `COUCH_DB`, `COUCH_USER` and `COUCH_PASS`to a host/db/user/pass combination that has write permissions to your _items-db_
8. start the Q server with `npm start:prod`


## Setup Q editor
Now you probably want to [setup your Q editor](https://github.com/nzzdev/Q-editor) to connect it to your Q server.
