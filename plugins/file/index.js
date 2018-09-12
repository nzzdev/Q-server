const Boom = require("boom");
const AWS = require("aws-sdk");
const Mimos = require("mimos");
const mimos = new Mimos();
const hasha = require("hasha");
const slugify = require("slugify");

function getDateString() {
  const now = new Date();
  const day = now.getDate() < 10 ? `0${now.getDate()}` : now.getDate();
  const month =
    now.getMonth() < 9 ? `0${now.getMonth() + 1}` : now.getMonth() + 1;
  return `${now.getFullYear()}/${month}/${day}`;
}

async function upload(s3, params) {
  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

module.exports = {
  name: "q-file",
  register: async function(server, options) {
    if (
      !options.s3AccessKey ||
      !options.s3SecretKey ||
      !options.s3Region ||
      !options.s3Bucket
    ) {
      throw new Error("Not all required S3 options are provided.");
    }

    const s3 = new AWS.S3({
      accessKeyId: options.s3AccessKey,
      secretAccessKey: options.s3SecretKey,
      region: options.s3Region
    });

    const contentTypes = options.contentTypes || [
      "application/pdf",
      "image/jpeg",
      "image/png"
    ];

    server.route({
      method: "POST",
      path: "/file",
      options: {
        auth: "q-auth",
        cors: {
          credentials: true,
          additionalHeaders: [
            "x-requested-with",
            "x-file-name",
            "cache-control"
          ]
        },
        tags: ["api"],
        payload: {
          output: "stream",
          parse: true,
          allow: "multipart/form-data",
          maxBytes: 10485760
        }
      },
      handler: async function(request, h) {
        const file = request.payload.file;
        if (!file) {
          return Boom.badData("Failed to read file");
        }

        let contentType = file.hapi.headers["content-type"];
        // The HTML spec (https://html.spec.whatwg.org/multipage/scripting.html#scriptingLanguages) defines
        // that servers should only use content-type text/javascript for js resources.
        // Therefore we normalize all content-types containing the string javascript to text/javascript
        if (contentType.includes("javascript")) {
          contentType = "text/javascript";
        }

        if (contentTypes.indexOf(contentType) === -1) {
          return Boom.unsupportedMediaType("Content-type not allowed");
        }

        // The mimos package doesn't store the extension for the content-type text/javascript
        // because its marked as deprecated by IANA. Therefore we get the file extension based
        // on the content-type application/javascript
        let type = mimos.type(contentType);
        if (contentType === "text/javascript") {
          type = mimos.type("application/javascript");
        }
        const extension = type.extensions[0] || "";

        // buffer the contents to hash and later upload to s3
        const fileBuffered = new Promise(resolve => {
          let data = [];
          file.on("data", d => {
            data.push(d);
          });
          file.on("end", () => {
            resolve(Buffer.concat(data));
          });
        });
        const fileBuffer = await fileBuffered;

        const hash = await hasha(fileBuffer, {
          algorithm: "md5"
        });

        const filenameParts = file.hapi.filename.split(".");
        // remove the extension by removing the last element of the array, we will add a normalized one based on the content-type
        filenameParts.pop();
        // add the hash to the last element after the split by . and the removing of the extension (this is the filename)
        filenameParts[filenameParts.length - 1] = `${
          filenameParts[filenameParts.length - 1]
        }-${hash}`;
        // join everything together again (appending the extension)
        const hashedFilename = `${filenameParts
          .map(filenamePart => slugify(filenamePart))
          .join(".")}.${extension}`;
        let fileKey = `${getDateString()}/${hashedFilename}`;

        if (options.keyPrefix) {
          fileKey = `${options.keyPrefix}${fileKey}`;
        }

        const params = {
          Bucket: options.s3Bucket,
          Key: fileKey,
          Body: fileBuffer,
          ContentType: contentType
        };

        if (options.cacheControl) {
          params.CacheControl = options.cacheControl;
        }

        const data = await upload(s3, params);

        return {
          key: data.Key,
          url: data.Location
        };
      }
    });

    server.route({
      method: "GET",
      path: "/file/{fileKey*}",
      options: {
        tags: ["api"]
      },
      handler: async function(request, h) {
        return new Promise((resolve, reject) => {
          s3.getObject(
            {
              Bucket: options.s3Bucket,
              Key: request.params.fileKey
            },
            (err, data) => {
              if (err) {
                return reject(
                  new Boom("error", { statusCode: err.statusCode })
                );
              }
              return resolve(
                h
                  .response(data.Body)
                  .header(
                    "cache-control",
                    "max-age=31536000, s-maxage=31536000, stale-while-revalidate=31536000, stale-if-error=31536000, immutable"
                  )
                  .type(data.ContentType)
              );
            }
          );
        });
      }
    });
  }
};
