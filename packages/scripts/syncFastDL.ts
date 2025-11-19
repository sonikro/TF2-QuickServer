import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';

const bzip2 = require('node-bzip2');

type SyncDependencies = {
  s3Client: S3Client;
};

const getAllMapsFromDisk = (params: { mapsDir: string }): string[] => {
  const { mapsDir } = params;
  
  if (!fs.existsSync(mapsDir)) {
    return [];
  }

  const files = fs.readdirSync(mapsDir);
  return files.filter(file => file.endsWith('.bsp'));
};

const compressMaps = (params: { mapsDir: string; fastDLDir: string }): void => {
  const { mapsDir, fastDLDir } = params;

  if (!fs.existsSync(fastDLDir)) {
    fs.mkdirSync(fastDLDir, { recursive: true });
  }

  const mapFiles = getAllMapsFromDisk({ mapsDir });

  console.log(`Found ${mapFiles.length} maps to compress`);

  for (const mapFile of mapFiles) {
    const mapPath = path.join(mapsDir, mapFile);
    const compressedPath = path.join(fastDLDir, `${mapFile}.bz2`);

    if (fs.existsSync(compressedPath)) {
      console.log(`Already compressed: ${mapFile}.bz2`);
      continue;
    }

    console.log(`Compressing ${mapFile}...`);
    const data = fs.readFileSync(mapPath);
    const compressed = bzip2.compress(data);
    fs.writeFileSync(compressedPath, compressed);
    console.log(`Compressed: ${mapFile}.bz2 (${formatBytes(compressed.length)})`);
  }
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const validateEnvironment = (): void => {
  const requiredEnvVars = ['FASTDL_BUCKET_NAME'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }
};

const getLocalFileHashes = (params: { fastDLDir: string }): Map<string, { size: number; path: string }> => {
  const { fastDLDir } = params;
  const hashes = new Map<string, { size: number; path: string }>();

  const files = fs.readdirSync(fastDLDir);
  for (const file of files) {
    if (file.endsWith('.bz2')) {
      const filePath = path.join(fastDLDir, file);
      const stat = fs.statSync(filePath);
      hashes.set(file, { size: stat.size, path: filePath });
    }
  }

  return hashes;
};

const uploadFile = async (params: {
  s3Client: S3Client;
  bucketName: string;
  key: string;
  filePath: string;
}): Promise<void> => {
  const { s3Client, bucketName, key, filePath } = params;
  const fileStream = fs.createReadStream(filePath);
  const fileSize = fs.statSync(filePath).size;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileStream,
    ContentType: 'application/octet-stream',
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await s3Client.send(command);
  console.log(`Uploaded: ${key} (${formatBytes(fileSize)})`);
};

const getRemoteFileHashes = async (params: {
  s3Client: S3Client;
  bucketName: string;
  prefix: string;
}): Promise<Map<string, { size: number }>> => {
  const { s3Client, bucketName, prefix } = params;
  const hashes = new Map<string, { size: number }>();
  let continuationToken: string | undefined;

  while (true) {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key && obj.Size !== undefined) {
          hashes.set(
            path.basename(obj.Key),
            { size: obj.Size }
          );
        }
      }
    }

    if (!response.IsTruncated) break;
    continuationToken = response.NextContinuationToken;
  }

  return hashes;
};

const deleteRemoteFile = async (params: {
  s3Client: S3Client;
  bucketName: string;
  key: string;
}): Promise<void> => {
  const { s3Client, bucketName, key } = params;
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
  console.log(`Deleted: ${key}`);
};

const syncFastDL = async (): Promise<void> => {
  try {
    validateEnvironment();

    const bucketName = process.env.FASTDL_BUCKET_NAME as string;
    const mapsDir = path.resolve(__dirname, '../../maps');
    const fastDLDir = path.resolve(__dirname, '../../fastdl/maps');
    const s3Prefix = 'fastdl/maps';

    console.log('Starting FastDL sync process...');
    console.log(`  Maps directory: ${mapsDir}`);
    console.log(`  FastDL directory: ${fastDLDir}`);
    console.log(`  S3 bucket: ${bucketName}`);
    console.log(`  S3 prefix: ${s3Prefix}`);

    compressMaps({ mapsDir, fastDLDir });

    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    const dependencies: SyncDependencies = { s3Client };

    console.log('\nFetching remote file list...');
    const remoteHashes = await getRemoteFileHashes({
      s3Client: dependencies.s3Client,
      bucketName,
      prefix: s3Prefix,
    });

    const localHashes = getLocalFileHashes({ fastDLDir });

    console.log(`Found ${localHashes.size} local files and ${remoteHashes.size} remote files`);

    let filesUploaded = 0;
    let filesDeleted = 0;

    console.log('\nUploading new and modified files...');
    for (const [fileName, localInfo] of localHashes) {
      const remoteInfo = remoteHashes.get(fileName);

      if (!remoteInfo || remoteInfo.size !== localInfo.size) {
        const key = `${s3Prefix}/${fileName}`;
        await uploadFile({ s3Client: dependencies.s3Client, bucketName, key, filePath: localInfo.path });
        filesUploaded++;
      } else {
        console.log(`Unchanged: ${fileName}`);
      }
    }

    console.log('\nRemoving deleted files...');
    for (const [fileName, _] of remoteHashes) {
      if (!localHashes.has(fileName)) {
        const key = `${s3Prefix}/${fileName}`;
        await deleteRemoteFile({ s3Client: dependencies.s3Client, bucketName, key });
        filesDeleted++;
      }
    }

    console.log(`\nSync completed successfully!`);
    console.log(`  Files uploaded: ${filesUploaded}`);
    console.log(`  Files deleted: ${filesDeleted}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\nFastDL sync failed: ${errorMessage}`);
    process.exit(1);
  }
};

syncFastDL().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
