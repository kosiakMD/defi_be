import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { WETH_ADDRESS } from '@app/common/constant';
import { AaveUser } from '@app/common/dto';
import {
  AaveProtocolEnum,
  ChainAbbrEnum,
  ChainIdEnum,
  ProjectEnum,
  ProtocolNameEnum,
} from '@app/common/enum';
import { UniswapResponseData } from '@app/common/interfaces/transactions.interfaces';

import { AccountService } from '../../account/account.service';
import { BaseData } from '../../interfaces/transactions.interfaces';
import { Mapper } from '../../mappers/mapper';
import { PriceService } from '../../price/price.service';
import { AaveSubgraph } from '../../thegraph/aave.subgraph';
import { FeatureEnum } from '../features/features.enum';
import AbstractProtocol from './abstractProtocol';
import BasicProtocol from './basicProtocol';

@Injectable()
export class AaveProtocolV2 extends BasicProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.eth, ChainAbbrEnum.plg];
  readonly project = ProjectEnum.aave;
  readonly displayName = 'Aave V2';
  readonly name = AaveProtocolEnum.AaveV2;
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.lending, FeatureEnum.borrowing],
    [ChainAbbrEnum.plg]: [FeatureEnum.lending, FeatureEnum.borrowing],
  };

  protected dataProvider;
  protected feeRate: 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly aaveSubgraph: AaveSubgraph,
    protected readonly mapper: Mapper,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
  ) {
    super();
    this.dataProvider = this;
  }

  async getDataByAddresses(addresses: string, chainId: ChainIdEnum): Promise<BaseData[]> {
    const originAddressesArray = addresses.toLowerCase().split(',');
    const [usersResult, ethPriceResult] = await Promise.allSettled([
      this.getUserReserves(originAddressesArray, chainId),
      this.getEthPrice(),
    ]);

    if (usersResult.status !== 'fulfilled') {
      throw new Error('Failed to get user reserves');
    }

    const ethPrice = ethPriceResult.status === 'fulfilled' ? ethPriceResult.value : null;

    const responseData = this.formatData(usersResult.value, ethPrice);
    return this.mapper.mapData(
      [...responseData.aaveLendingPositions.keys()],
      originAddressesArray,
      responseData,
      ProjectEnum.aave,
      ProtocolNameEnum.AaveV2,
      chainId,
    );
  }

  getUserReserves(addresses: string[], chainId: ChainIdEnum): any {
    return this.aaveSubgraph.getUsersReserves(addresses, chainId);
  }

  async getEthPrice(): Promise<number> {
    const results = await this.priceService.getTokenPricesFetch([WETH_ADDRESS], ChainIdEnum.eth);
    return Number(results.prices[WETH_ADDRESS]);
  }

  formatData(aaveUser: AaveUser[], ethPriceUSD: number): UniswapResponseData {
    const aaveLendingPositions = new Map<string, AaveUser>();
    aaveUser.forEach((user) => {
      user.reserves.forEach((userReserve: any) => {
        const { price } = userReserve.reserve;
        userReserve.reserve.priceUSD = (price.priceInEth / 1e18) * ethPriceUSD;
      });

      aaveLendingPositions.set(user.userAddress, user);
    });

    return {
      uniswapLiquidityPositions: new Map(),
      aaveLendingPositions,
    };
  }
}
export default AaveProtocolV2;
