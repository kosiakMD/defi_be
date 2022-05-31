import { VaultTypeEnum } from '@app/common/enum/opportunities/opportunity.enums';

export interface IFeatureStats {
  count: number;
  feature: VaultTypeEnum;
}
export interface IChainStats {
  count: number;
  chain_id: VaultTypeEnum;
}

export interface IOpportunityStats {
  chains: IChainStats[];
  features: IFeatureStats[];
}
