import { WinstonModule } from 'nest-winston';
import { utilities } from 'nest-winston/dist/winston.utilities';
import winston from 'winston';

export function createLogger() {
  return WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(winston.format.timestamp(), utilities.format.nestLike()),
      }),
    ],
  });
}
