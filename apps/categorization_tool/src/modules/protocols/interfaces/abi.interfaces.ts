export interface ChainAbi {
  chain: string | null;
  abi: string | null;
  abiCode: string | null;
  proxy?: boolean;
  implementation?: string;
}
