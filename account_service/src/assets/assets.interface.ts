import { ChainIdEnum } from '../common/enum';

export enum AssetState {
  pending = 'pending',
  processing = 'processing',
  ready = 'ready',
}

export interface Asset {
  id: number;
  address: string;
  name: string;
  symbol: string;
  chain: ChainIdEnum;
  decimals: number;
  status: AssetState;
}
