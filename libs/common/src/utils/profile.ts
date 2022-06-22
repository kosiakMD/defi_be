import { LoggerService } from '@nestjs/common';

// TODO: This is test code, to be deleted
export async function logExecutionTime<T = any>(
  logger: LoggerService,
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
  } catch (e) {
    const took = Date.now() - started;
    logger.error(
      {
        message: `Failed action '${label}' took ${took}`,
        action: label,
        took,
      },
      e,
    );
    throw e;
  }
}