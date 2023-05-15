module.exports = {
  path: "/editor/tools-ordered-by-user-usage",
  method: "GET",
  options: {
    auth: {
      strategies: ["q-auth-azure", "q-auth-ld"],
    },
    cors: {
      credentials: true,
    },
    description: "Returns all available Q tool names",
    tags: ["api", "editor"],
  },
  handler: async (request, h) => {
    const username = request.auth.credentials.name;
    const toolsWithUsageByUser =
      await request.server.methods.db.tools.getWithUserUsage({
        username,
        session: {
          credentials: request.auth.credentials,
          artifacts: request.auth.artifacts,
        },
      });
    return toolsWithUsageByUser
      .sort((a, b) => {
        return b.usage - a.usage;
      })
      .map((row) => {
        return row.tool;
      });
  },
};
