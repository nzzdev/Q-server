const wreck = require('wreck');

const items = require('./items.js');
const designDocs = require('./design-docs.js');

module.exports = {
  setupCouch: async function() {
    try {
      await wreck.put('http://localhost:5984/q-items');
    } catch (err) {
      console.log('failed to create database', err);
      process.exit(1);
    }
    try {
      for (let item of items) {
        const createItemResponse = await wreck.post('http://localhost:5984/q-items', {
          payload: item
        });
      }
      for (let designDoc of designDocs) {
        const createItemResponse = await wreck.post('http://localhost:5984/q-items', {
          payload: designDoc
        });
      }
      return;
    } catch (err) {
      console.log('failed to add documents to database', err);
      process.exit(1);
    }
  }
}
