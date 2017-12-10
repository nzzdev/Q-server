module.exports = [
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
      "numberOfItemsPerDepartmentAndTool": {
        "reduce": "_sum",
        "map": "function(doc) {\n  if (doc.department !== undefined && doc.tool !== undefined && doc.active === true) {\n    emit([doc.department, doc.tool], 1);\n  }\n}"
      },
      "byTool": {
        "map": "function (doc) {\n  if (doc.tool) {\n    emit(doc.tool, 1);\n  }\n}",
        "reduce": "_count"
      },
      "byDepartment": {
        "reduce": "_count",
        "map": "function (doc) {\n  if (doc.department) {\n    emit(doc.department, 1);\n  } else {\n    emit(\"NO_DEPARTMENT\", 1)\n  }\n}"
      },
      "byCreatedBy": {
        "reduce": "_count",
        "map": "function (doc) {\n  if (doc.createdBy) {\n    emit(doc.createdBy, 1);\n  }\n}"
      }
    },
    "indexes": {
      "search": {
        "analyzer": "standard",
        "index": "function (doc) {\n  if (doc._id.indexOf('_design/') === 0) {\n    return;\n  }\n  index(\"id\", doc._id);\n  if (doc.title) {\n    index(\"title\", doc.title);\n  }\n  if (doc.subtitle) {\n    index(\"subtitle\", doc.subtitle);\n  }\n  if (doc.annotations) {\n    index(\"annotations\", doc.annotations);\n  }\n  if (doc.createdBy) {\n    index(\"createdBy\", doc.createdBy);\n  }\n  if (doc.department) {\n    index(\"department\", doc.department);\n  }\n  if (doc.publication) {\n    index(\"publication\", doc.publication);\n  }\n  if (doc.tool) {\n    index(\"tool\", doc.tool)\n  }\n  if (doc.active !== undefined) {\n    index(\"active\", doc.active);\n  } else {\n    index(\"active\", false);\n  }\n  if (doc.updatedDate || doc.createdDate) {\n    var date;\n    if (doc.updatedDate) {\n      date = new Date(doc.updatedDate);\n    } else if (doc.createdDate) {\n      date = new Date(doc.createdDate);\n    }\n    if (date) {\n      index(\"orderDate\", date.valueOf());\n    }\n  }\n}"
      }
    }
  }
]
