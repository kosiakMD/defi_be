import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { HealthController } from './health/health.controller';

@Module({
	controllers: [HealthController],
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ['.env.development.local', '.env.development', '.env.production', '.env'],
		}),
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
