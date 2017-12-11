async function sendItemUpdate(event, slackWebClient, item, options, server) {
  const messageBlocks = [];
  if (event === 'item.new') {
    messageBlocks.push(`A new ${item.tool} *${item.title}* was created by ${item.createdBy}`);
  }
  if (event === 'item.update') {
    messageBlocks.push(`The ${item.tool} *${item.title}* was updated by ${item.updatedBy}`);
  }
  if (event === 'item.new' || event === 'item.update') {
    messageBlocks.push(`Edit: ${options.qEditorBaseUrl}/item/${item._id}`);
    if (item.active === true) {
      messageBlocks.push(`The ${item.tool} is active.`);
    }
  }
  slackWebClient.chat.postMessage(options.channel, messageBlocks.join('\n'), { as_user: true }, function(err, res) {
    if (err) {
      server.log(['error', 'slack'], err)
    } else {
      server.log(['info', 'slack'], res)
    }
  });

  if ((event === 'item.new' || event === 'item.update') && item.active === true && options.postScreenshots === true) {
    let publicationConfig = server.methods.getPublicationConfigByKey(item.publication);
    const screenshotResponse = await server.inject(`/screenshot/${item._id}.png?target=${publicationConfig.defaultWebTarget}&width=350&dpr=2&padding=10px&background=white&wait=300`);

    if (screenshotResponse.statusCode !== 200) {
      throw(screenshotResponse);
    }

    slackWebClient.files.upload('q.png', {
      channels: options.channel,
      title: item.title,
      file: {
        value: screenshotResponse.rawPayload,
        options: {
          filename: `${item._id}.png`,
          knownLength: screenshotResponse.rawPayload.length
        }
      },
    }, (err, res) => {
      if (err) {
        server.log(['error', 'slack'], err)
      } else {
        server.log(['info', 'slack'], res)
      }
    });
  }
}

module.exports = {
  sendItemUpdate: sendItemUpdate
};
