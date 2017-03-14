---
name: b
title: Installation
---

## Setup CouchDB
1. Get [CouchDB](https://couchdb.apache.org) up an running. At NZZ we use [Cloudant on IBM Bluemix](https://console.ng.bluemix.net/catalog/services/cloudant-nosql-db). But there are other providers or you can host it yourself. You have to get a little bit familiar with CouchDB.
2. Create a new database to hold all the _item_ documents. Lets call it _items-db_ for now.
3. Q server currently supports an authentication scheme to let users authenticate against CouchDB. Go and read about [CouchDB Security Features](https://wiki.apache.org/couchdb/Security_Features_Overview#Security_Features_Overview-1). If you are using Cloudant, you can decide if you want to use the Cloudant authentication system or if you prefer to use the CouchDB *_users* database. If you want to use the CouchDB *_users* database, make sure the *_security* document of your _items-db_ looks something like this:
```json
{
  "_id": "_security",
  "couchdb_auth_only": true,
  "members": {
    "names": [],
    "roles": []
  },
  "admins": {}
}
```
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
2. We use (https://github.com/hapijs/confidence) for configuration of different environments. Have a look at some examples to get yourself familiar with the format.
3. edit _config/misc.js_ and set the information about your setup, _qServerBaseUrl_ and _db_ will be different for sure.
4. edit _config/targets.js_ to your needs. If you just want to serve visual elements to your website, you need only one target. [Learn more about targets](about-targets.html)
5. edit _config/tools.js_ to configure your tools as well as the endpoint used per target.
6. edit _config/editorConfig.js_ to set some configuration used by the Q editor connecting to your Q server.


## Setup Q editor
Now you probably want to [setup your Q editor](https://nzzdev.github.io/Q-editor) to connect it to your Q server.
