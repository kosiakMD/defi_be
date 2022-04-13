import * as Joi from 'joi';

import {
  appValidation,
  awsValidation,
  databaseValidation,
  redisValidation,
  logsValidation,
  httpValidation,
  sentryValidation,
} from '@app/common/config/components';

import { services, multifarm } from './components';

export const validationSchema = Joi.object({
  // Common Components
  ...appValidation,
  ...awsValidation,
  ...databaseValidation,
  ...httpValidation,
  ...logsValidation,
  ...redisValidation,
  ...sentryValidation,

  // Opportunities Service Specific
  ...services.validation,
  ...multifarm.validation,
});

export const validationOptions = {
  abortEarly: false,
};
