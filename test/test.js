const Expect = require('chai').expect;

describe('MarkupFetcher', function() {
	describe('getError', function() {
		it('should return an error when no itemId is given', function() {
			Expect(new Error).to.be.an('error');
		});
	});

});