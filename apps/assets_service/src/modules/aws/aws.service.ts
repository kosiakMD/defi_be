import * as AWS from 'aws-sdk';

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { AwsConfigService } from '../../config/aws/aws.config.service';

@Injectable()
export class AwsService {
  constructor(private readonly awsConfigService: AwsConfigService) {}

  public async uploadFile(
    bucketPath,
    fileContentType,
    filename: string,
    content: Buffer,
  ): Promise<AWS.S3.ManagedUpload.SendData> {
    const uploadParameters = {
      Bucket: `${this.awsConfigService.rootBucket}`,
      Key: `${bucketPath}/${filename}`,
      Body: content,
      ContentType: fileContentType,
    };
    return await this.s3
      .upload(uploadParameters, (err: Error) => {
        if (err) throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
      })
      .promise();
  }

  private get s3(): AWS.S3 {
    return new AWS.S3({
      endpoint: this.awsConfigService.endpoint,
      region: this.awsConfigService.region,
      // signatureVersion: this.awsConfigService.signatureVersion,
    });
  }
}
