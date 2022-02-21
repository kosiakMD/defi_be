import { Logger } from '@app/common';

const logTimeMsg = (timerName, t0) =>
  `[timer] [${timerName}]: timer ${((new Date().valueOf() - t0) * 0.001).toFixed(3)}s`;
const timeMsg = (timerName, t0) => `[${timerName}]: timer#${t0}`;

const getTimerName = (target: any, propertyKey: string) =>
  (target instanceof Function ? `static ${target.name}` : target.constructor.name) +
  `.${propertyKey}`;

export function SyncTimer() {
  return function (
    target: any,
    propertyKey: string,
    propertyDescriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const logger: Logger = this.logger;

    propertyDescriptor = propertyDescriptor || Object.getOwnPropertyDescriptor(target, propertyKey);

    const timerName = getTimerName(target, propertyKey);
    const originalMethod = propertyDescriptor.value;
    propertyDescriptor.value = function (...args: any[]) {
      const t0 = new Date().valueOf();
      logger.log(`[timer] [${timerName}]: begin`);
      try {
        const result = originalMethod.apply(this, args);
        logger.log(logTimeMsg(timerName, t0));
        return result;
      } catch (err) {
        logger.log(logTimeMsg(timerName, t0));
        throw err;
      }
    };
    return propertyDescriptor;
  };
}

export function AsyncTimer() {
  return function (
    target: any,
    propertyKey: string,
    propertyDescriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    propertyDescriptor = propertyDescriptor || Object.getOwnPropertyDescriptor(target, propertyKey);

    const timerName = getTimerName(target, propertyKey);
    const originalMethod = propertyDescriptor.value;
    propertyDescriptor.value = async function (...args: any[]) {
      const logger: Logger = this.logger;
      const t0 = new Date().valueOf();
      // logger.time(`[timer] [${timerName}]: begin`);
      const tKey = timeMsg(timerName, t0);
      logger.time(tKey);
      try {
        const result = await originalMethod.apply(this, args);
        logger.timeEnd(tKey);
        return result;
      } catch (err) {
        logger.timeEnd(tKey);
        throw err;
      }
    };
    return propertyDescriptor;
  };
}

// HrTime - the current high-resolution real time in nanoseconds as a bigint.

const logHrTimeMsg = (timerName, t0) =>
  `[hrtimer] [${timerName}]: timer ${process.hrtime.bigint() - t0}ns`;

export function SyncHrTimer(
  target: any,
  propertyKey: string,
  propertyDescriptor: PropertyDescriptor,
): PropertyDescriptor {
  const logger: Logger = this.logger;

  propertyDescriptor = propertyDescriptor || Object.getOwnPropertyDescriptor(target, propertyKey);

  const timerName = getTimerName(target, propertyKey);
  const originalMethod = propertyDescriptor.value;
  propertyDescriptor.value = function (...args: any[]) {
    const t0 = process.hrtime.bigint();
    logger.log(`[hrtimer] [${timerName}]: begin`);
    try {
      const result = originalMethod.apply(this, args);
      logger.log(logHrTimeMsg(timerName, t0));
      return result;
    } catch (err) {
      logger.log(logHrTimeMsg(timerName, t0));
      throw err;
    }
  };
  return propertyDescriptor;
}

export function AsyncHrTimer(
  target: any,
  propertyKey: string,
  propertyDescriptor: PropertyDescriptor,
): PropertyDescriptor {
  const logger: Logger = this.logger;

  propertyDescriptor = propertyDescriptor || Object.getOwnPropertyDescriptor(target, propertyKey);

  const timerName = getTimerName(target, propertyKey);
  const originalMethod = propertyDescriptor.value;
  propertyDescriptor.value = async function (...args: any[]) {
    const t0 = process.hrtime.bigint();
    logger.log(`[hrtimer] [${timerName}]: begin`);
    try {
      const result = await originalMethod.apply(this, args);
      logger.log(logHrTimeMsg(timerName, t0));
      return result;
    } catch (err) {
      logger.log(logHrTimeMsg(timerName, t0));
      throw err;
    }
  };
  return propertyDescriptor;
}
