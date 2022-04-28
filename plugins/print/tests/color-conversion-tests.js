const Wreck = require("@hapi/wreck");
const Lab = require("@hapi/lab");
const Code = require("@hapi/code");
const lab = (exports.lab = Lab.script());

const expect = Code.expect;
const it = lab.it;

const fs = require("fs");
const UTIF = require("utif");
const PNG = require("pngjs").PNG;

const {
  getCmykTiffBufferFromPng,
  promoteTiffBufferToBlack
} = require("../conversions.js");

const { createCanvas } = require("canvas");
const canvas = createCanvas(1, 1);
const ctx = canvas.getContext("2d");
function getPixelPngBuffer(colorStyle) {
  ctx.fillStyle = colorStyle;
  ctx.fillRect(0, 0, 1, 1);
  return canvas.toBuffer();
}

function toPercentagePixels(pixels) {
  return pixels.map(pixel =>
    pixel.map(channel => Math.round((channel / 255) * 100))
  );
}

function getCMYKPixelsFromTiffBuffer(tiffBuffer) {
  const ifds = UTIF.decode(tiffBuffer);

  // tiff tag descriptions: https://www.loc.gov/preservation/digital/formats/content/tiff_tags.shtml
  // tiff image file format: http://www.fileformat.info/format/tiff/corion.htm

  const bitsPerSample = ifds[0].t258;
  const stripOffsets = ifds[0].t273[0];
  const stripByteCounts = ifds[0].t279[0];
  const cmykPixels = [];

  for (
    let i = stripOffsets; // start at the offset
    i < stripOffsets + stripByteCounts; // keep going until we reach the end of the strip
    i = i + bitsPerSample.length // seek by the amount of bitsPerSample sizes (this is 4 or 5, depending on the number of channels in the source image. I have seen 5 channels in CMYK images ¯\_(ツ)_/¯)
  ) {
    cmykPixels.push([
      tiffBuffer[i], // C
      tiffBuffer[i + 1], // M
      tiffBuffer[i + 2], // Y
      tiffBuffer[i + 3] // K
    ]);
  }
  return cmykPixels;
}

function getPNGPixelsFromFile(path) {
  return new Promise(resolve => {
    fs.createReadStream(path)
      .pipe(
        new PNG({
          filterType: 4
        })
      )
      .on("parsed", function() {
        const pixels = [];
        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            const idx = (this.width * y + x) << 2;

            pixels.push([
              this.data[idx],
              this.data[idx + 1],
              this.data[idx + 2]
            ]);
          }
        }
        resolve(pixels);
      });
  });
}

lab.experiment("color conversions", () => {
  it("converts 000000 RGB to almost 100K CMYK", async () => {
    const pngBuffer = getPixelPngBuffer("#000000");
    const tiffBuffer = promoteTiffBufferToBlack(
      await getCmykTiffBufferFromPng(pngBuffer, 300)
    );
    const cmykPixels = getCMYKPixelsFromTiffBuffer(tiffBuffer);
    const cmyk = cmykPixels[0];
    expect(cmyk[0]).to.be.equal(0);
    expect(cmyk[1]).to.be.equal(0);
    expect(cmyk[2]).to.be.equal(0);
    expect(cmyk[3]).to.be.greaterThan(240);
  });

  // it("converts all the sophie viz colors to the correct CMYK value", async () => {
  //   const { res, payload } = await Wreck.get(
  //     "https://service.sophie.nzz.ch/bundle/sophie-viz-color@1.vars.json",
  //     {
  //       json: "force"
  //     }
  //   );

  //   for (const colorName in payload["sophie-viz-color"].general) {
  //     const pngBuffer = getPixelPngBuffer(
  //       payload["sophie-viz-color"].general[colorName]
  //     );
  //     // fs.writeFileSync("test.png", pngBuffer);
  //     const tiffBuffer = promoteTiffBufferToBlack(
  //       await getCmykTiffBufferFromPng(pngBuffer, 300)
  //     );
  //     const cmykPixels = getCMYKPixelsFromTiffBuffer(tiffBuffer);
  //     const cmyk = cmykPixels[0];
  //     expect(cmyk[0]).to.be.equal(0);
  //     expect(cmyk[1]).to.be.equal(0);
  //     expect(cmyk[2]).to.be.equal(0);
  //     expect(cmyk[3]).to.be.equal(255);
  //   }
  // });

  // it("converts all the colors in the same way as photoshop from RGB to CMYK with WAN-IFRAnewspaper26v5.icc", async () => {
  //   const pngData = await getPNGPixelsFromFile(
  //     `${__dirname}/viz-colors-rgb.png`
  //   );
  //   const cmykDataFromPhotoshop = toPercentagePixels(
  //     await getCMYKPixelsFromTiffBuffer(
  //       fs.readFileSync(`${__dirname}/viz-colors-cmyk.tif`)
  //     )
  //   );
  //   const cmykDataFromQ = toPercentagePixels(
  //     await getCMYKPixelsFromTiffBuffer(
  //       await getCmykTiffBufferFromPng(
  //         fs.readFileSync(`${__dirname}/viz-colors-rgb.png`)
  //       )
  //     )
  //   );

  //   fs.writeFileSync(
  //     `${__dirname}/test.tif`,
  //     await getCmykTiffBufferFromPng(
  //       fs.readFileSync(`${__dirname}/viz-colors-rgb.png`)
  //     )
  //   );

  //   cmykDataFromQ.forEach((pixel, index) => {
  //     expect(pixel[0]).to.be.equal(cmykDataFromPhotoshop[index][0]);
  //     expect(pixel[1]).to.be.equal(cmykDataFromPhotoshop[index][1]);
  //     expect(pixel[2]).to.be.equal(cmykDataFromPhotoshop[index][2]);
  //     expect(pixel[3]).to.be.equal(cmykDataFromPhotoshop[index][3]);
  //   });
  // });
});
