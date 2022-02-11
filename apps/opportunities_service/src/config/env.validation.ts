import * as Joi from 'joi';

import {
  appValidation,
  awsValidation,
  databaseValidation,
  redisValidation,
  logsValidation,
  httpValidation,
} from '@app/common/config/components';

import { services, multifarm } from './components';

export const validationSchema = Joi.object({
  // Common Components
  ...appValidation,
  ...logsValidation,
  ...awsValidation,
  ...databaseValidation,
  ...redisValidation,
  ...httpValidation,

  // Opportunities Service Specific
  ...services.validation,
  ...multifarm.validation,
});

export const validationOptions = {
  abortEarly: false,
};
