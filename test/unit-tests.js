const Lab = require('lab');
const Code = require('code');
const lab = exports.lab = Lab.script();

const expect = Code.expect;
const before = lab.before;
const after = lab.after;
const it = lab.it;

const items = require('./mock/items.js');

lab.experiment('meta-properties', () => {

  const deleteMetaProperties = require('../helper/meta-properties').deleteMetaProperties;

  it('strips meta properties', () => {
    let slimItem = deleteMetaProperties(items[0]);
    expect(slimItem.editedBy).to.be.undefined();
    expect(slimItem.createdBy).to.be.undefined();
    expect(slimItem.department).to.be.undefined();
  })

  it('should only delete all meta properties', function() {
    let slimItem = deleteMetaProperties(items[0]);
    expect(slimItem.data).to.not.be.undefined();
  })

});
