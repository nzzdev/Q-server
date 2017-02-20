const expect = require('chai').expect;

const deleteMetaProperties = require('../helper/meta-properties').deleteMetaProperties;

const item = require('./resources/item.json');

describe('data manipulation', () => {
  it('should delete all meta properties', function() {
    let slimItem = deleteMetaProperties(item);
    expect(slimItem).to.not.have.property('editedBy');
    expect(slimItem).to.not.have.property('createdBy');
    expect(slimItem).to.not.have.property('department');
  })


  it('should only delete all meta properties', function() {
    let slimItem = deleteMetaProperties(item);
    expect(slimItem).to.have.property('data');
  })

})


