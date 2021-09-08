import winston from 'winston';

export const LOGGER = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      format: winston.format.json(),
    }),
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});
