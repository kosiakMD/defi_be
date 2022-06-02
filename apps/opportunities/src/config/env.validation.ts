import * as Joi from 'joi';

import {
  appValidation,
  awsValidation,
  databaseValidation,
  httpValidation,
  logsValidation,
  redisValidation,
} from '@app/common/config/components';

import { multifarm, services } from './components';

export const validationSchema = Joi.object({
  // Common Components
  ...appValidation,
  ...awsValidation,
  ...databaseValidation,
  ...httpValidation,
  ...logsValidation,
  ...redisValidation,
  // Opportunities Service Specific
  ...services.validation,
  ...multifarm.validation,
});

export const validationOptions = {
  abortEarly: false,
};
