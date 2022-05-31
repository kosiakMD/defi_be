import * as Joi from 'joi';

import {
  appValidation,
  redisValidation,
  logsValidation,
  httpValidation,
} from '@app/common/config/components';

import { service } from './components';

export const validationSchema = Joi.object({
  // Common Components
  ...appValidation,
  ...logsValidation,
  ...redisValidation,
  ...httpValidation,

  // Service Specific
  ...service.validation,
});

export const validationOptions = {
  abortEarly: false,
};
