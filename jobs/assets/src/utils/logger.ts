import winston from 'winston';

export const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      format: winston.format.json(),
    }),
    new winston.transports.Console({
      level: 'info',
      format:
        Boolean(process.env.LOG_IN_JSON) && process.env.LOG_IN_JSON.toLowerCase() === 'true'
          ? winston.format.json()
          : winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});
