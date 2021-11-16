import { ChainIdEnum } from '../config/enum';

export interface JobInterface {
  chain: ChainIdEnum;
  protocol: string;
  feature: string;
  placeholder: string;
  manageMapping(): Promise<void>;
  updateTracked(): Promise<void>;
  updateWithChainData(): Promise<any[]>;
}
