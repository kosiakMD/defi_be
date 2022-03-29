import { process } from './processor';

export const lambdaHandler = async (): Promise<void> => {
  await process();
};
