import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AwsConfigService {
  constructor(private readonly configService: ConfigService) {}

  public get rootBucket(): string {
    return this.configService.get<string>('aws.root_bucket');
  }

  public get region(): string {
    return this.configService.get<string>('aws.region');
  }

  public get endpoint(): string {
    return this.configService.get<string>('aws.endpoint');
  }

  public get awsKeyId(): string {
    return this.configService.get<string>('aws.aws_key_id');
  }

  public get awsSecretAccessKey(): string {
    return this.configService.get<string>('aws.aws_secret_key');
  }
}
