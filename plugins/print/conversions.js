const gm = require("gm").subClass({ imageMagick: true });
const UTIF = require("utif");

async function identify(pngBuffer) {
  return await new Promise((resolve, reject) => {
    gm(pngBuffer).identify((err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    });
  });
}

async function getCmykTiffBufferFromPng(pngBuffer, dpi = 300, profiles) {
  const data = await identify(pngBuffer);
  // if there is a profile in the source PNG, we let imagemagick use it
  if (data.hasOwnProperty("Profiles")) {
    return await new Promise((resolve, reject) => {
      gm(pngBuffer)
        .command("convert")
        .profile(profiles.ISOnewspaper26v4)
        .intent("Relative") // https://imagemagick.org/script/command-line-options.php#intent; corresponds to Asura workflow
        .setFormat("tiff")
        .units("PixelsPerInch")
        .density(dpi, dpi)
        .compress("None") // do not compress, its easier to edit the image in promote-to-black step
        .toBuffer(async (err, tiffBuffer) => {
          if (err) {
            return reject(err);
          }
          return resolve(tiffBuffer);
        });
    });
  } else {
    return await new Promise((resolve, reject) => {
      gm(pngBuffer)
        .command("convert")
        .profile(profiles.sRGBIEC6196621) // assume a profile as none is given in the source file
        .profile(profiles.ISOnewspaper26v4)
        .intent("Relative") // https://imagemagick.org/script/command-line-options.php#intent; corresponds to Asura workflow
        .setFormat("tiff")
        .units("PixelsPerInch")
        .density(dpi, dpi)
        .compress("None") // do not compress, its easier to edit the image in promote-to-black step
        .toBuffer(async (err, tiffBuffer) => {
          if (err) {
            return reject(err);
          }
          return resolve(tiffBuffer);
        });
    });
  }
}

function promoteTiffBufferToBlack(tiffBuffer) {
  const ifds = UTIF.decode(tiffBuffer);

  // tiff tag descriptions: https://www.loc.gov/preservation/digital/formats/content/tiff_tags.shtml
  // tiff image file format: http://www.fileformat.info/format/tiff/corion.htm

  const bitsPerSample = ifds[0].t258;
  const stripOffsets = ifds[0].t273[0];
  const stripByteCounts = ifds[0].t279[0];

  // loop over the image in tiffBuffer to promote mostly black pixels to K only
  for (
    let i = stripOffsets; // start at the offset
    i < stripOffsets + stripByteCounts; // keep going until we reach the end of the strip
    i = i + bitsPerSample.length // seek by the amount of bitsPerSample sizes (this is 4 or 5, depending on the number of channels in the source image. There is support for an alpha channel, thats when we would have 5 instead of only 4 channels.
  ) {
    const cmyk = [
      tiffBuffer[i], // C
      tiffBuffer[i + 1], // M
      tiffBuffer[i + 2], // Y
      tiffBuffer[i + 3] // K
    ];

    // if K (black) is the dominant channel, we set the others to 0
    // maybe we should use some curve to add the stripped colors to the K channel somehow
    if (Math.max(...cmyk) === cmyk[3]) {
      tiffBuffer[i] = 0; // C
      tiffBuffer[i + 1] = 0; // M
      tiffBuffer[i + 2] = 0; // Y

      // add 5% additional black to the K channel in case we stripped the others
      // but only if it is already pretty black
      if (tiffBuffer[i + 3] > 150) {
        tiffBuffer[i + 3] = Math.min(tiffBuffer[i + 3] + 255 / 20, 255);
      }
    }
  }

  return tiffBuffer;
}

module.exports = {
  getCmykTiffBufferFromPng,
  promoteTiffBufferToBlack
};
