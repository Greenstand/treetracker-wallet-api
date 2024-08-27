import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'bucket'; // TODO: confirm this
    this.region = process.env.S3_REGION || 'us-west-1'; // TODO: confirm this
    this.s3Client = new S3Client({ region: this.region });
  }

  async upload(file: Buffer, key: string, mimetype: string): Promise<string> {
    const params: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: mimetype,
      ACL: 'public-read',
    };

    const command = new PutObjectCommand(params);
    await this.s3Client.send(command);

    return `https://${this.bucket}.s3-${this.region}.amazonaws.com/${key}`;
  }
}
