import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StoredObjectMetadata { contentLength: number; contentType: string }
export interface UploadGrant { expiresAt: string; headers: Readonly<Record<string, string>>; url: string }
export interface DownloadGrant { expiresAt: string; url: string }

export interface ObjectStorage {
  authorizeDownload(key: string): Promise<DownloadGrant>;
  authorizeUpload(key: string, contentType: string, contentLength: number): Promise<UploadGrant>;
  delete(key: string): Promise<void>;
  metadata(key: string): Promise<StoredObjectMetadata>;
}

const uploadSeconds = 300;
const downloadSeconds = 300;

function expiry(seconds: number): string { return new Date(Date.now() + seconds * 1000).toISOString(); }

export class S3ObjectStorage implements ObjectStorage {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor(region: string, bucket: string) {
    this.bucket = bucket;
    this.client = new S3Client({ region });
  }

  async authorizeUpload(key: string, contentType: string, contentLength: number): Promise<UploadGrant> {
    const command = new PutObjectCommand({ Bucket: this.bucket, ContentLength: contentLength, ContentType: contentType, Key: key });
    return {
      expiresAt: expiry(uploadSeconds),
      headers: { "Content-Type": contentType },
      url: await getSignedUrl(this.client, command, { expiresIn: uploadSeconds }),
    };
  }

  async authorizeDownload(key: string): Promise<DownloadGrant> {
    return { expiresAt: expiry(downloadSeconds), url: await getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: downloadSeconds }) };
  }

  async metadata(key: string): Promise<StoredObjectMetadata> {
    const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    if (result.ContentLength === undefined || !result.ContentType) throw new Error("Uploaded object metadata is incomplete");
    return { contentLength: result.ContentLength, contentType: result.ContentType };
  }

  async delete(key: string): Promise<void> { await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })); }
}
