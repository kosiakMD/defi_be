import { process } from './processor';

const lambdaHandler = async (): Promise<void> => {
  await process();
};

export default lambdaHandler;
