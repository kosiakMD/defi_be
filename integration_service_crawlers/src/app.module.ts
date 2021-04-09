import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

import { WinstonModule } from '../../gateway/dist/common/Logger/WinstonModule';
import { HealthController } from './health/health.controller';

@Module({
	controllers: [HealthController],
	imports: [
		WinstonModule.forRoot({
			// options
			level: process.env.LOG_LEVEL || 'info',
			format: winston.format.json(),
			defaultMeta: { service: process.env.SERVICE_NAME },
			transports: [
				// NestJS console like logs
				new winston.transports.Console({
					format: winston.format.combine(
						winston.format.timestamp(),
						nestWinstonModuleUtilities.format.nestLike(),
					),
				}),
				// - Write all logs with level `error` and below to `error.log`
				new winston.transports.File({ filename: process.env.LOG_ERROR_FILE, level: 'error' }),
				// - Write all logs with level `info` and below to `combined.log`
				new winston.transports.File({ filename: process.env.LOG_COMBINED_FILE }),
			],
		}),
		TerminusModule,
	],
})
export class AppModule {}
