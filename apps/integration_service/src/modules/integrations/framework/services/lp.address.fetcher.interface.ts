export interface ILpAddressFetcher {
  fetchPoolsLps(chainCode: any, address: string, abi: any): Promise<string[]>;
}
