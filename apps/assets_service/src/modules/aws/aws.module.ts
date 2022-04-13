import { Module } from '@nestjs/common';

import { AwsConfigService } from '../../config/aws/aws.config.service';
import { AwsService } from './aws.service';

@Module({
  imports: [AwsConfigService],
  exports: [AwsConfigService, AwsService],
  providers: [AwsConfigService, AwsService],
})
export class AwsModule {}
