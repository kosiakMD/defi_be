import * as s3 from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import zlib from 'zlib';

import { Injectable } from '@nestjs/common';

import { AwsConfigService } from '../config/aws/aws.config.service';
import { UploadFileRequest } from './types/upload-file.request';
import { UploadFileResponse } from './types/upload-file.response';

@Injectable()
export class AwsService {
  private readonly s3Client: s3.S3Client;

  constructor(private readonly awsConfigService: AwsConfigService) {
    this.s3Client = new s3.S3Client({
      region: awsConfigService.region,
      credentials: {
        accessKeyId: awsConfigService.awsKeyId,
        secretAccessKey: awsConfigService.awsSecretAccessKey,
      },
    });
  }

  public async uploadFile(request: UploadFileRequest): Promise<UploadFileResponse> {
    const gzipStream = request.content.pipe(zlib.createGzip());

    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: request.bucket,
        Key: request.key,
        Body: gzipStream,
        ContentType: request.contentType,
        ContentEncoding: 'gzip',
      },
    });

    const { Location }: s3.CompleteMultipartUploadCommandOutput = await upload.done();

    const { ContentLength } = await this.s3Client.send(
      new s3.HeadObjectCommand({
        Bucket: request.bucket,
        Key: request.key,
      }),
    );

    return {
      bucket: request.bucket,
      key: request.key,
      fileSize: ContentLength,
      // TODO: We should not expose S3 location here, we should use CDN instead
      url: Location,
    };
  }
}
