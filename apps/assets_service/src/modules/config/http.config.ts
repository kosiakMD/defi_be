import { registerAs } from '@nestjs/config';

export default registerAs('http', () => ({
  timeout: process.env.HTTP_TIMEOUT || 60e3,
  maxRedirects: process.env.HTTP_MAX_REDIRECTS || 2,
}));
