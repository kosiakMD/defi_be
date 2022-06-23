import { Logger } from '../Logger';

// TODO: This is test code, to be deleted
export async function logExecutionTime<T = any>(
  logger: Logger,
  label: string,
  action: () => Promise<T>,
) {
  const started = Date.now();

  try {
    const response = await action();

    const took = Date.now() - started;
    logger.debug({
      message: `Action '${label}' took ${took}`,
      action: label,
      took,
    });

    return response;
  } catch (error) {
    const took = Date.now() - started;
    logger.error({
      message: `Failed action '${label}' took ${took}`,
      action: label,
      took,
      error,
    });
    throw error;
  }
}
