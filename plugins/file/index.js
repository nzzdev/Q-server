const AWS = require("aws-sdk");
const uuid = require("uuid");
const Mimos = require("mimos");
const Boom = require("boom");
const mimos = new Mimos();

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
        const fullPath = request.payload.fullPath;

        if (!file) {
          return Boom.badData("Failed to read file");
        }

        const contentType = file.hapi.headers["content-type"];
        if (contentTypes.indexOf(contentType) === -1) {
          return Boom.unsupportedMediaType("Content-type not allowed");
        }

        const type = mimos.type(contentType);

        let fileKey;
        if (fullPath === undefined) {
          const extension = type.extensions[0] || "";
          const filename = `${uuid.v4()}.${extension}`;
          fileKey = `${getDateString()}/${filename}`;

          if (options.keyPrefix) {
            fileKey = `${options.keyPrefix}${fileKey}`;
          }
        } else {
          fileKey = fullPath;
        }

        const params = {
          Bucket: options.s3Bucket,
          Key: fileKey,
          Body: file,
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
  }
};
