import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, Logger } from '@app/common';
import { WETH_ADDRESS } from '@app/common/constant';
import { AaveUser } from '@app/common/dto';
import {
  AaveProtocolEnum,
  ChainAbbrEnum,
  ChainIdEnum,
  ProjectEnum,
  ProtocolNameEnum,
} from '@app/common/enum';
import { UniswapSubgraphLikeData } from '@app/common/interfaces/transactions.interfaces';

import { AccountService } from '../../account/account.service';
import { BaseData } from '../../interfaces/transactions.interfaces';
import { PriceService } from '../../price/price.service';
import { AaveSubgraph } from '../../thegraph/aave.subgraph';
import { FeatureEnum } from '../features/features.enum';
import DataProviderProtocol from './dataProviderProtocol';
import { Mapper } from './mappers/mapper';

@Injectable()
export class AaveProtocolV2 extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.eth, ChainAbbrEnum.plg];
  readonly project = ProjectEnum.aave;
  readonly displayName = 'Aave V2';
  readonly name = AaveProtocolEnum.AaveV2;
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.lending, FeatureEnum.borrowing],
    [ChainAbbrEnum.plg]: [FeatureEnum.lending, FeatureEnum.borrowing],
  };

  protected dataProvider;
  public feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly mapper: Mapper,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly subgraph: AaveSubgraph,
  ) {
    super();
    this.dataProvider = this;
  }

  // override
  async getData(addresses: string, chain: ChainDto): Promise<BaseData[]> {
    const originAddressesArray = addresses.toLowerCase().split(',');
    const [usersResult, ethPriceResult] = await Promise.allSettled([
      this.getUserReserves(originAddressesArray, chain.id),
      this.getEthPrice(),
    ]);

    if (usersResult.status !== 'fulfilled') {
      throw new Error('Failed to get user reserves');
    }

    const ethPrice = ethPriceResult.status === 'fulfilled' ? ethPriceResult.value : null;

    const responseData = this.formatData(usersResult.value, ethPrice);
    return this.mapper.mapData(
      [...responseData.subgraphLending.keys()],
      originAddressesArray,
      responseData,
      ProjectEnum.aave,
      ProtocolNameEnum.AaveV2,
      chain,
    );
  }

  getUserReserves(addresses: Address[], chainId: ChainIdEnum): any {
    return this.subgraph.getUsersReserves(addresses, chainId);
  }

  async getEthPrice(): Promise<number> {
    const results = await this.priceService.getTokenPricesFetch([WETH_ADDRESS], ChainIdEnum.eth);
    return Number(results.prices[WETH_ADDRESS]);
  }

  formatData(aaveUser: AaveUser[], ethPriceUSD: number): UniswapSubgraphLikeData {
    const aaveLendingPositions = new Map<string, AaveUser>();
    aaveUser.forEach((user) => {
      user.reserves.forEach((userReserve: any) => {
        const { price } = userReserve.reserve;
        userReserve.reserve.priceUSD = (price.priceInEth / 1e18) * ethPriceUSD;
      });

      aaveLendingPositions.set(user.userAddress, user);
    });

    return {
      subgraphPools: new Map(),
      subgraphLending: aaveLendingPositions,
    };
  }
}
export default AaveProtocolV2;
