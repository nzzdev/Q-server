module.exports = {
  path: '/health',
  method: 'GET',
  options: {
    tags: ['api']
  },
  handler: (request, h) => {
    return 'Q server is alive';
  }
}