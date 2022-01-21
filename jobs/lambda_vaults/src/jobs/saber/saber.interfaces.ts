export interface poolInfo {
  decimals: number;
  mintAuthority: string;
  supply: string;
}

export interface tokenInfo {
  mint: string;
  owner: string;
  decimals: number;
  amount: string;
}

export interface rpcDataPools {
  jsonrpc: string;
  id: number;
  method: string;
  params: [string, { encoding: string }];
}

export interface poolData {
  decimals: number;
  mintAuthority: string;
  supply: string;
  tokens: {
    mint: string;
    owner: string;
    decimals: number;
    amount: string;
  }[];
}
