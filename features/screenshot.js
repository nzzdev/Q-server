const puppeteer = require('puppeteer');

async function getScreenshot(emptyPageUrl, markup, scripts, stylesheets, config) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  
  const page = await browser.newPage();
  await page.setViewport({
    width: config.width,
    height: 30000,
    deviceScaleFactor: config.dpr
  });

  await page.goto(emptyPageUrl);

  page.setContent(`<body style="margin: 0;"><div id="q-screenshot-service-container">${markup}</div></body>`);

  for (let script of scripts) {
    await page.mainFrame().addScriptTag(script);
  }

  for (let stylesheet of stylesheets) {
    await page.mainFrame().addStyleTag(stylesheet);
  }

  const graphicElement = await page.$('#q-screenshot-service-container');

  const imageBuffer = await graphicElement.screenshot();
  browser.close();
  return imageBuffer;
}

module.exports = {
  getScreenshot: getScreenshot
}