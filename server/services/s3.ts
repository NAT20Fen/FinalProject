import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, GetObjectTaggingCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { UploadedFile } from "express-fileupload";

// Debug logging for environment variables
console.log('AWS Configuration:', {
  region: process.env.AWS_USER_REGION,
  bucket: process.env.AWS_USER_S3_BUCKET,
  hasAccessKey: !!process.env.AWS_USER_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AWS_USER_SECRET_ACCESS_KEY
});

if (!process.env.AWS_USER_REGION) {
  throw new Error('Missing required AWS configuration: AWS_USER_REGION');
}

if (!process.env.AWS_USER_ACCESS_KEY_ID || !process.env.AWS_USER_SECRET_ACCESS_KEY) {
  throw new Error('Missing required AWS credentials');
}

if (!process.env.AWS_USER_S3_BUCKET) {
  throw new Error('Missing required AWS configuration: AWS_USER_S3_BUCKET');
}

const s3Client = new S3Client({
  region: process.env.AWS_USER_REGION,
  credentials: {
    accessKeyId: process.env.AWS_USER_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_USER_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_USER_S3_BUCKET;

async function getUniqueKey(baseKey: string): Promise<string> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: baseKey.substring(0, baseKey.lastIndexOf('/')), // Get directory
  });

  try {
    const result = await s3Client.send(command);
    const existingFiles = result.Contents || [];
    const existingFilenames = new Set(
      existingFiles.map(file => file.Key?.split('/').pop() || '')
    );

    let key = baseKey;
    let counter = 1;
    const ext = baseKey.includes('.') ? baseKey.substring(baseKey.lastIndexOf('.')) : '';
    const baseName = baseKey.includes('.') ? 
      baseKey.substring(0, baseKey.lastIndexOf('.')) : 
      baseKey;

    while (existingFilenames.has(key.split('/').pop() || '')) {
      key = `${baseName} (${counter})${ext}`;
      counter++;
    }

    return key;
  } catch (error) {
    console.error('Error checking for existing files:', error);
    return baseKey;
  }
}

export async function uploadFile(file: UploadedFile, baseKey: string, username: string): Promise<string> {
  const key = await getUniqueKey(baseKey);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.data,
    ContentType: file.mimetype,
    Tagging: `username=${username}`,
  });

  await s3Client.send(command);
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_USER_REGION}.amazonaws.com/${key}`;
}

export async function uploadText(content: string, key: string, username: string): Promise<string> {
  console.log('Attempting to upload text with key:', key);
  console.log('Using bucket:', BUCKET_NAME);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: 'text/plain',
    Tagging: `username=${username}`,
  });

  try {
    await s3Client.send(command);
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_USER_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Error uploading text to S3:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    throw error;
  }
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export interface S3Object {
  key: string;
  username: string;
  lastModified?: Date;
}

export async function listUserObjects(username: string): Promise<S3Object[]> {
  const objects: S3Object[] = [];

  const filesCommand = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: `files/${username}/`
  });

  const notesCommand = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: `notes/${username}/`
  });

  try {
    const [filesResult, notesResult] = await Promise.all([
      s3Client.send(filesCommand),
      s3Client.send(notesCommand)
    ]);

    const allObjects = [...(filesResult.Contents || []), ...(notesResult.Contents || [])];

    for (const object of allObjects) {
      if (object.Key) {
        const taggingCommand = new GetObjectTaggingCommand({
          Bucket: BUCKET_NAME,
          Key: object.Key
        });

        const tags = await s3Client.send(taggingCommand);
        const usernameTag = tags.TagSet?.find(tag => tag.Key === 'username' && tag.Value === username);

        if (usernameTag) {
          objects.push({
            key: object.Key,
            username: username,
            lastModified: object.LastModified
          });
        }
      }
    }

    return objects;
  } catch (error) {
    console.error('Error listing objects:', error);
    return [];
  }
}

export async function listObjectsByUsername(username: string): Promise<string[]> {
  const objects = await listUserObjects(username);
  return objects.map(obj => obj.key);
}

// Updated deleteObject function with better error logging
export async function deleteObject(key: string): Promise<void> {
  console.log('Attempting to delete S3 object with key:', key);
  console.log('Using bucket:', BUCKET_NAME);

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const response = await s3Client.send(command);
    console.log('S3 delete response:', response);
  } catch (error) {
    console.error('Error deleting object from S3:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    throw error;
  }
}