import { registerAs } from '@nestjs/config';

export const service = {
  config: registerAs('service', () => ({})),
  validation: {},
};
