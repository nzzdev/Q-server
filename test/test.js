const Expect = require('chai').expect;
const repository = require('../processing/repository');

describe('MarkupFetcher', function() {
	describe('get Q item', function() {
		it('should return true if Q item is returned and is an object', function() {
			repository.fetchQItem('246ad4a75d6c684a4959fad9d174ec27')
				.then(json => {
					Expect(item).to.be.an('object');
				})
		});
	});
});