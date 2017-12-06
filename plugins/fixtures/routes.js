module.exports = {
  storeFixtures: {
    path: '/fixtures/data',
    method: 'GET',
    options: {
      auth: 'q-auth',
      cors: {
        credentials: true
      },
      description: 'creates fixture data items for all tools and stores them in db',
      tags: ['api', 'fixtures', 'non-critical']
    },
    handler: async (request, h) => {
      try {
        const fixtures = await request.server.methods.fixtures.get();
        let result = {
          saved: [],
          errors: []
        }

        // update all existing fixture data items in db
        for (const item of fixtures.existing) {
          const updateResponse = await request.server.inject({
            url: `/item`,
            method: 'PUT',
            payload: item,
            credentials: request.auth.credentials              
          });
          if (updateResponse.statusCode === 200) {
            result.saved.push(item._id);
          } else {
            result.errors.push(`Error ${updateResponse.statusCode} - ${updateResponse.result.message} for ${item._id}`);
          }
        }
        
        // create all new fixture data items in db
        for (const item of fixtures.new) {
          const createResponse = await request.server.inject({
            url: `/item`,
            method: 'POST',
            payload: item,
            credentials: request.auth.credentials
          });
          if (createResponse.statusCode === 200) {
            result.saved.push(item._id);
          } else {
            result.errors.push(`Error ${createResponse.statusCode} - ${createResponse.result.message} for ${item._id}`);
          }
        }
        return result;
      } catch (e) {
        return Boom.internal(e.message);
      }
      
    }
  },
  getExistingFixtureIds: {
    path: '/fixtures/data/ids',
    method: 'GET',
    options: {
      description: 'returns all available fixture data ids',
      tags: ['api', 'fixtures', 'non-critical']
    },
    handler: async (request, h) => {
      try {
        const fixtures = await request.server.methods.fixtures.get();
        if (fixtures) {
          return fixtures.existing.map(item => item._id);
        }
      } catch (e) {
        return Boom.internal(e.message);
      }
    }
  }
}
