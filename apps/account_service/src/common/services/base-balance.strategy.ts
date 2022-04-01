export abstract class BaseBalanceStrategy {
  protected constructor() {}

  get strategyName() {
    return this.constructor.name;
  }
}