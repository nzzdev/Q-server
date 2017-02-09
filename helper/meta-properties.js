const metaProperties = [
  '_id',
  '_rev',
  'tool',
  'editorVersion',
  'rendererVersion',
  'createdDate',
  'createdBy',
  'department',
  'annotations',
  'editedBy',
  'updatedDate',
  'active',
  'activateDate',
  'deactivateDate'
];

const deleteMetaProperties = function(item) {
  for (var i = 0; i < metaProperties.length; i++) {
    delete item[metaProperties[i]];
  }
  return item;
}

module.exports = {
  deleteMetaProperties: deleteMetaProperties
};
