module.exports = {
  path: '/health',
  method: 'GET',
  handler: (request, reply) => {
    reply('Q server is alive');
  }
}