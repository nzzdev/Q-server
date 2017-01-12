const Expect = require('chai').expect;
const repository = require('../processing/repository');

describe('Q data access check', function() {
  describe('get Q item', function() {
    it('should pass if Q item is returned and is an object', function() {
      return repository.fetchQItem('246ad4a75d6c684a4959fad9d174ec27')
        .then(json => {
          Expect(json).to.be.a('object');
        })
    });

    it('should pass if no Q item is returned', function() {
      return repository.fetchQItem('abc')
        .catch(err => {
          Expect(err).to.be.an('error');
        })
    })
  });
});