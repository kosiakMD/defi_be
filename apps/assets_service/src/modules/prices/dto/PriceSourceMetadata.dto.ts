export class PriceSourceMetadata {
  constructor() {
    this.lastOperation = 0;
    this.lastExecutionHistoricalPricesJob = 0;
  }
  lastOperation: number;
  lastExecutionHistoricalPricesJob: number;
}
