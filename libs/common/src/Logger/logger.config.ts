import { ConfigService } from '@nestjs/config';

import { EnvEnum } from '@app/common';
import { LogConfig, winstonParams } from '@app/common/Logger/winston';

export const getAwsConfig = (configService: ConfigService): LogConfig['awsConfig'] => ({
  region: configService.get<string>('AWS_REGION'),
  accessKeyId: configService.get<string>('AWS_ACCESS_KEY_ID'),
  secretAccessKey: configService.get<string>('AWS_SECRET_ACCESS_KEY'),
});

export const getWinstonParams = (identifier: string, configService: ConfigService) =>
  winstonParams({
    identifier: identifier,
    environment: configService.get<EnvEnum>('NODE_ENV'),
    logErrorFile: configService.get<string>('LOG_ERROR_FILE'),
    logCombineLog: configService.get<string>('LOG_COMBINED_FILE'),
    serviceName: configService.get<string>('SERVICE_NAME'),
    level: configService.get<string>('LOG_LEVEL'),
    meta: { env: configService.get<string>('ENV') },
    awsConfig: getAwsConfig(configService),
  });
