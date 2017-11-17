const wreck = require('wreck');

const items = require('./items.js');

module.exports = {
  setupCouch: async function() {
    try {
      await wreck.put('http://localhost:5984/q-items');
    } catch (err) {
    }
    try {
      for (let item of items) {
        const createItemResponse = await wreck.post('http://localhost:5984/q-items', {
          payload: item
        });
      }
      return;
    } catch (err) {
    }
  }
}
