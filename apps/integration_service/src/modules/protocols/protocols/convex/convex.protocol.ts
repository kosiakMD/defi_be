import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  ProjectEnum,
  ProtocolNameEnum,
} from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import BasicProtocol from '../basicProtocol';
import { ConvexCurveLpStaking } from './convex.curveLP.staking';
import { ConvexCvxStaking } from './convex.cvx.staking';
import { ConvexCvxCRVStaking } from './convex.cvxCRV.staking';
import { ConvexCvxLockedStaking } from './convex.cvxLockedStaking';

@Injectable()
export class ConvexProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.eth];
  readonly project = ProjectEnum.convex;
  readonly name = ProtocolNameEnum.Convex;
  readonly displayName = 'Convex';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.staking],
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly cvxCRVStaking: ConvexCvxCRVStaking,
    private readonly curveLpStaking: ConvexCurveLpStaking,
    private readonly cvxStaking: ConvexCvxStaking,
    private readonly cvxLockedStaking: ConvexCvxLockedStaking,
  ) {
    super();
    // Test Addresses
    // 0xbdfa4f4492dd7b7cf211209c4791af8d52bf5c50 lots of pools, locked cvx, staked cvxCRV
    // 0x50664ede715e131f584d3e7eaabd7818bb20a068 multiple unlocks for cvx
  }

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const chainFeatures = await Promise.allSettled(
      this.features[chain.abbr].map((f) => {
        return this.getFeatureData(addresses, chain, f);
      }),
    );

    const [data, errors] = handlePromiseAllSettled(chainFeatures);
    return [data.flat(), errors];
  }

  public async getFeatureData(
    addresses: Address[],
    chain: ChainDto,
    feature: FeatureEnum,
  ): Promise<BaseData[]> {
    switch (feature) {
      case FeatureEnum.staking:
        return this.fetchAndMergeStakingData(addresses, chain);
      default:
        return [];
    }
  }

  private async fetchAndMergeStakingData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<BaseData[]> {
    const [cvxData, cvxCRVData, curveLpData, cvxLockedData] = await Promise.all([
      this.cvxStaking.getData(addresses, chain),
      this.cvxCRVStaking.getData(addresses, chain), // missing crv rewards, missing cvx rewards
      this.curveLpStaking.getData(addresses, chain),
      this.cvxLockedStaking.getData(addresses, chain),
    ]);

    // Merge staking data, otherwise multiple independant BaseDataStaking will each override each other
    // if belonging to the same user
    cvxData.forEach((baseData) => {
      const cvxCrv = cvxCRVData.find((bd) => bd.userAddress === baseData.userAddress);
      const curveLp = curveLpData.find((bd) => bd.userAddress === baseData.userAddress);
      baseData.items.push(...cvxCrv.items, ...curveLp.items);
    });

    return [].concat(cvxData, cvxLockedData);
  }
}
