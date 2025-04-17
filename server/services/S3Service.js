const { PutObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../infra/aws/s3');

const upload = async (file, key, mimetype) => {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const params = {
    Bucket: bucket,
    ContentType: mimetype,
    Key: key,
    Body: file,
  };

  const command = new PutObjectCommand(params);
  await s3.send(command);

  return `https://${bucket}.s3-${region}.amazonaws.com/${encodeURIComponent(key)}`;
};

module.exports = {
  upload,
};
