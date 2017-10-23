const puppeteer = require('puppeteer');
const browserPromise = puppeteer.launch({ args: ['--no-sandbox'] });
let browserWSEndpoint;
browserPromise
  .then(browser => {
    browserWSEndpoint = browser.wsEndpoint();
  })

async function getScreenshot(emptyPageUrl, markup, scripts, stylesheets, config) {

  if (!browserWSEndpoint) {
    throw new Error('Browser not ready yet');
  }

  const browser = puppeteer.connect(browserWSEndpoint);

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
  browser.disconnect();
  return imageBuffer;
}

module.exports = {
  getScreenshot: getScreenshot
}