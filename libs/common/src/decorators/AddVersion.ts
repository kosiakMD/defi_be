import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const AddVersion = (...versions: string[]): CustomDecorator<string> =>
  SetMetadata('apiVersion', versions);
