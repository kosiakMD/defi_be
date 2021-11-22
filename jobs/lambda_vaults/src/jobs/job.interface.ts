import { ChainIdEnum } from '@app/common';

export interface JobInterface {
  chain: ChainIdEnum;
  protocol: string;
  feature: string;
  placeholder: string;
  manageMapping(): Promise<void>;
  updateWithChainData(): Promise<any[]>;
}
