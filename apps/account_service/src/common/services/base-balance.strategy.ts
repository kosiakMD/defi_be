export abstract class BaseBalanceStrategy {
  get strategyName() {
    return this.constructor.name;
  }
}
