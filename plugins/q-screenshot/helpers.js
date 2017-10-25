const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

// start a chromium process here
const browserPromise = puppeteer.launch({ args: ['--no-sandbox'] });
let browserWSEndpoint;
browserPromise
  .then(browser => {
    browserWSEndpoint = browser.wsEndpoint();
  })

// fetches assets and returnes a concatenated string containing everything fetched
async function getConcatenatedAssets(assets, userAgent) {
  let result = '';
  for (let asset of assets) {
    if (asset.content) {
      result = result + asset.content;
    }
    if (asset.url) {
      const response = await fetch(asset.url, {
        headers: {
          'User-Agent': userAgent
        }
      });
      if (response.ok) {
        result = result + await response.text();
      }
    }
  }
  return result;
}

async function getScreenshot(emptyPageUrl, markup, scripts, stylesheets, config) {
  await browserPromise;

  if (!browserWSEndpoint) {
    throw new Error('Browser not ready yet');
  }
  const browser = await puppeteer.connect({browserWSEndpoint: browserWSEndpoint});

  const page = await browser.newPage();

  // the height of 16384 is just a wild guess that no graphic will ever exceed this
  await page.setViewport({
    width: config.width,
    height: 16384,
    deviceScaleFactor: config.dpr
  });

  await page.goto(emptyPageUrl);

  let bodyStyle = 'margin: 0;';
  if (config.background) {
    bodyStyle += `background: ${config.background}`;
  }
  page.setContent(`<body style="${bodyStyle}"><div id="q-screenshot-service-container" style="padding: ${config.padding};">${markup}</div></body>`);

  const userAgent = await page.evaluate(() => {
    return navigator.userAgent;
  })

  const scriptContent = await getConcatenatedAssets(scripts, userAgent);
  await page.mainFrame().addScriptTag({
    content: scriptContent
  });

  const styleContent = await getConcatenatedAssets(stylesheets);
  await page.mainFrame().addStyleTag({
    content: styleContent
  });

  // wait for the next animation frame (style is applied then)
  await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      requestAnimationFrame(resolve);
    });
  });

  const graphicElement = await page.$('#q-screenshot-service-container');

  const imageBuffer = await graphicElement.screenshot({
    omitBackground: !config.background
  });

  // we should use disconnect once this is released in puppeteer. it's merged to master, so anything after 0.12.0 should have it
  // await browser.disconnect();
  await browser.close();
  
  return imageBuffer;
}

module.exports = {
  getScreenshot: getScreenshot
}