export interface TokenDataStrategy {
  fillMissingData(
    tokens: any[],
    prices: any,
    chain: number,
  ): Promise<{ tokens: any[]; prices: any }>;
}
