interface NetworkInfo {
  name: string;
  symbol: string;
}

export enum Network {
  ETHEREUM,
}

export const networks: Record<Network, NetworkInfo> = {
  [Network.ETHEREUM]: { name: 'Ethereum', symbol: 'eth' },
};
