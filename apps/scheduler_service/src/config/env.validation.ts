import * as Joi from 'joi';

import {
  appValidation,
  redisValidation,
  logsValidation,
  httpValidation,
  databaseValidation,
} from '@app/common/config/components';

export const validationSchema = Joi.object({
  // Common Components
  ...appValidation,
  ...logsValidation,
  ...redisValidation,
  ...databaseValidation,
  ...httpValidation,
});

export const validationOptions = {
  abortEarly: false,
};
