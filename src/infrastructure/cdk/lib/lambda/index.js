const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const s3 = new AWS.S3();

exports.handler = async () => {
  const bucketName = process.env.BUCKET_NAME;
  const efsMountPath = process.env.EFS_MOUNT_PATH;

  // List all objects in the S3 bucket
  const listObjectsParams = { Bucket: bucketName };
  const s3Objects = await s3.listObjectsV2(listObjectsParams).promise();

  for (const object of s3Objects.Contents) {
    const key = object.Key;
    const localFilePath = path.join(efsMountPath, key);

    // Ensure the directory exists
    fs.mkdirSync(path.dirname(localFilePath), { recursive: true });

    // Download the file from S3
    const getObjectParams = { Bucket: bucketName, Key: key };
    const fileStream = fs.createWriteStream(localFilePath);
    const s3Stream = s3.getObject(getObjectParams).createReadStream();

    await new Promise((resolve, reject) => {
      s3Stream.pipe(fileStream)
        .on('error', reject)
        .on('close', resolve);
    });

    console.log(`File ${key} copied to ${localFilePath}`);
  }
};
