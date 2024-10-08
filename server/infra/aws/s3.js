const { S3Client } = require('@aws-sdk/client-s3');

console.log(process.env.S3_REGION);

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  region: process.env.S3_REGION,
});

module.exports = s3;
