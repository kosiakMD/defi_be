export type CosmosBalance = {
  denom: string;
  amount: string;
};

export type CosmosWallet = { balances: CosmosBalance[] };

export type ProviderUrl = (address: string, network: string) => string;
export interface ICosmosProvider {
  getUrl(address: string): string;
  getNetwork(address: string): string;
  tokenMap: { [key: string]: string };
}
