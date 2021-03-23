import { SetMetadata } from '@nestjs/common';

export const AddVersion = (...versions: string[]) =>
	SetMetadata('apiVersion', versions);
