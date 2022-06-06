import { ConfigService } from '@nestjs/config';

import { winstonParams } from '@app/common/Logger/winston';

export const getWinstonParams = (identifier: string, configService: ConfigService) =>
  winstonParams({
    logErrorFile: configService.get<string>('LOG_ERROR_FILE'),
    logCombineLog: configService.get<string>('LOG_COMBINED_FILE'),
    serviceName: configService.get<string>('SERVICE_NAME'),
    level: configService.get<string>('LOG_LEVEL'),
    defaultMeta: { env: configService.get<string>('ENV') },
  });
