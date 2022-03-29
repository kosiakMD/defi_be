export interface IAbiFetcher {
  fetchAbiAndAbiCode(address: string): Promise<{ abi: string; abiCode: string }>;
}
