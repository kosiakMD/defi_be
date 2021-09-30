import { AaveUser } from 'src/dto/liquidity.position.dto';
import { BaseData, UniswapResponseData } from 'src/interfaces/transactions.interfaces';
import { Mapper } from 'src/mappers/mapper';
import { AaveSubgraph } from 'src/thegraph/aave.subgraph';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  AaveProtocolEnum,
  ChainAbbrEnum,
  ChainIdEnum,
  ProjectEnum,
  ProtocolNameEnum,
} from '../../common/enum';

import { Logger } from '../../Logger/Logger.service';
import { AccountService } from '../../account/account.service';
import { PriceService } from '../../price/price.service';
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
    const [users, ethPrice] = await Promise.all([
      this.getUserReserves(originAddressesArray, chainId),
      this.getEthPrice(),
    ]);

    const responseData = this.formatData(users, ethPrice);
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
    // TODO: use WETH_ADDRESS from '@app/common/constant'
    const WRAPPED_ETHER = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    const results = await this.priceService.getTokenPricesFetch([WRAPPED_ETHER], ChainIdEnum.eth);
    return Number(results.prices[WRAPPED_ETHER]);
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
