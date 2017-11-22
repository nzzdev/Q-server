const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

// start a chromium process here
let browserPromise = puppeteer.launch({ args: ['--no-sandbox'] });

// fetches assets and returns a concatenated string containing everything fetched
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
  let browser = await browserPromise;

  let page;

  // try to open the page, if it doesn't work, launch a new browser
  try {
    page = await browser.newPage();
  } catch (err) {
    browserPromise = puppeteer.launch({ args: ['--no-sandbox'] });
    browser = await browserPromise;
    page = await browser.newPage();
  }

  // the height of 16384 is the max height of a GL context in chromium or something
  await page.setViewport({
    width: config.width,
    height: 16384,
    deviceScaleFactor: config.dpr
  });

  await page.goto(emptyPageUrl);

  const userAgent = await page.evaluate(() => {
    return navigator.userAgent;
  })

  const styleContent = await getConcatenatedAssets(stylesheets);  
  
  let bodyStyle = 'margin: 0; padding: 0;';
  if (config.background) {
    bodyStyle += `background: ${config.background}`;
  }

  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>${styleContent}</style>
      </head>
      <body style="${bodyStyle}">
        <div id="q-screenshot-service-container" style="padding: ${config.padding};>${markup}</div>
      </body>
    </html>`;
  
  await page.setContent(content, {
    waitUntil: 'load'
  });

  const scriptContent = await getConcatenatedAssets(scripts, userAgent);
  await page.mainFrame().addScriptTag({
    content: scriptContent
  });

  // wait for the next idle callback (to have most probably finished all work)
  await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      requestIdleCallback(resolve);
    });
  });

  // we support a wait parameter to be set in milliseconds to wait before we take the screenshot
  if (config.waitBeforeScreenshot && config.waitBeforeScreenshot > 0) {
    await new Promise(resolve => {
      setTimeout(resolve, config.waitBeforeScreenshot);
    })
  }

  const graphicElement = await page.$('#q-screenshot-service-container');

  let isTransparent = false;
  if (!config.background || config.background === 'none') {
    isTransparent = true;
  }

  const imageBuffer = await graphicElement.screenshot({
    omitBackground: isTransparent
  });

  await page.close();
  
  return imageBuffer;
}

module.exports = {
  getScreenshot: getScreenshot
}
