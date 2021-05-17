export interface Token {
  id: string;
  name?: string;
  symbol?: string;
  decimals?: any;
  percentage?: number;
  reserve?: any;
  totalSupply?: any;
  positionInPool?: number;
}
