const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const s3Client = new S3Client({
  region: process.env.AWS_REGION, // Use the region where your bucket is located
  endpoint: `https://s3.${process.env.AWS_REGION}.amazonaws.com`, // The Maps Bucket is in us-east-1
});

exports.handler = async () => {
  const bucketName = process.env.BUCKET_NAME;
  const efsMountPath = process.env.EFS_MOUNT_PATH;
  console.log('Handler invoked');

  // Run the df -T command to check the filesystem type
  console.log('Checking filesystem type...');
  const dfCommand = 'df -T';
  const execSync = require('child_process').execSync;
  const dfOutput = execSync(dfCommand).toString();
  console.log(`Filesystem type output: ${dfOutput}`);
  // Check if EFS is mounted
  if (!dfOutput.includes('efs')) {
    console.error('EFS is not mounted. Exiting...');
    return;
  }

  // Test permission to write to EFS using ls -al /mnt/efs
  console.log('Testing write permission to EFS...');
  const testOutput = execSync('ls -al /mnt').toString();
  // Gets current POSIX User
  const userId = process.getuid();
  console.log(`Current POSIX User ID: ${userId}`);

  console.log(`EFS write permission test output: ${testOutput}`);
  console.log('EFS is mounted, proceeding with S3 to EFS transfer...');


  console.log(`Environment variables - BUCKET_NAME: ${bucketName}, EFS_MOUNT_PATH: ${efsMountPath}`);

  try {
    // List all objects in the S3 bucket
    console.log('Listing objects in the S3 bucket...');
    const listObjectsParams = { Bucket: bucketName };
    const listObjectsCommand = new ListObjectsV2Command(listObjectsParams);
    const s3Objects = await s3Client.send(listObjectsCommand);

    console.log(`Found ${s3Objects.Contents.length} objects in the bucket`);

    for (const object of s3Objects.Contents) {
      const key = object.Key;
      console.log(`Processing object with key: ${key}`);

      const localFilePath = path.join(efsMountPath, key);
      console.log(`Local file path resolved to: ${localFilePath}`);

      // Ensure the directory exists
      console.log(`Ensuring directory exists for path: ${path.dirname(localFilePath)}`);
      fs.mkdirSync(path.dirname(localFilePath), { recursive: true });

      // Download the file from S3
      console.log(`Downloading file from S3 with key: ${key}`);
      const getObjectParams = { Bucket: bucketName, Key: key };
      const getObjectCommand = new GetObjectCommand(getObjectParams);
      const s3Response = await s3Client.send(getObjectCommand);

      console.log(`File downloaded from S3, starting to write to local file: ${localFilePath}`);
      const fileStream = fs.createWriteStream(localFilePath);
      const s3Stream = Readable.from(s3Response.Body);

      await new Promise((resolve, reject) => {
        s3Stream.pipe(fileStream)
          .on('error', (err) => {
            console.error(`Error writing file ${localFilePath}:`, err);
            reject(err);
          })
          .on('close', () => {
            console.log(`File ${key} successfully written to ${localFilePath}`);
            resolve();
          });
      });

      // Print the contents of the file system under the EFS mount path
      console.log(`Contents of the EFS mount path (${efsMountPath}):`);
      const readFilesRecursively = (dirPath) => {
        const files = fs.readdirSync(dirPath, { withFileTypes: true });
        files.forEach(file => {
          const fullPath = path.join(dirPath, file.name);
          if (file.isDirectory()) {
            readFilesRecursively(fullPath);
          } else {
            console.log(fullPath);
          }
        });
      };

      readFilesRecursively(efsMountPath);
    }

    console.log('All files processed successfully');
  } catch (error) {
    console.error('An error occurred:', error);
    throw error;
  }
};
