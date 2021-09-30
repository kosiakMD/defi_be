import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainAbbrEnum, ProjectEnum, SushiSwapProtocolEnum } from '../../common/enum';

import { Logger } from '../../Logger/Logger.service';
import { AccountService } from '../../account/account.service';
import { Mapper } from '../../mappers/mapper';
import { PriceService } from '../../price/price.service';
// import { SushiswapService } from '../../sushiswap/sushiswap.service';
import { SushiswapSubgraph } from '../../thegraph/sushiswap.subgraph';
import { FeatureEnum } from '../features/features.enum';
import AbstractProtocol from './abstractProtocol';
import BasicProtocol from './basicProtocol';

@Injectable()
export class SushiswapProtocolV2 extends BasicProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.eth];
  readonly project = ProjectEnum.sushiswap;
  readonly name = SushiSwapProtocolEnum.sushiswapV2;
  readonly displayName = 'Sushiswap';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  protected dataProvider;
  protected feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    // private readonly sushiswapService: SushiswapService,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly sushiswapSubgraph: SushiswapSubgraph,
    protected readonly mapper: Mapper,
  ) {
    super();

    this.dataProvider = sushiswapSubgraph; // sushiswapService
  }

  // public getAllFeaturesRawData = async (
  //   address: Address,
  //   chainId?: ChainIdEnum,
  // ): Promise<RawFeaturesDto> => {
  //   const addresses = [address];
  //   if (chainId === ChainIdEnum.eth) {
  //     try {
  //       // const result = {};
  //       // type Responses = [LiquidityPositionResponse, StakingPositionResponse];
  //       const response = await this.sushiswapSubgraph.getPoolsAndStaking(addresses);
  //       console.log('response', response);
  //       // const originAddresses = getUniqueAndToLowerCaseArrayData(addresses);
  //       // const result = await this.mapper.mapData(
  //       //   addresses,
  //       //   originAddresses,
  //       //   response.data,
  //       //   ProjectEnum.sushiswap,
  //       // );
  //       // console.log('result', result);
  //       console.log('result', response.data?.liquidityPositions?.[0]);
  //       // const formated = this.mapper.mapLiquidityPositions(response.data?.liquidityPositions);
  //       // console.log('result', formated?.[0]);
  //
  //       return {
  //         rawPools: response.data?.liquidityPositions, // result?.liquidityPositions,
  //         rawStaking: null, // result?.stakingPositions,
  //       };
  //     } catch (e) {
  //       this.logger.error(e);
  //       throw e;
  //     }
  //   } else {
  //     throw new NotImplementedException(
  //       `Protocol "${ChainNameEnum[ChainIdEnum[chainId]]}" is not supported`,
  //     );
  //   }
  // };
  //
  // mapLiquidityPositions() {}
  //
  // public [FeatureEnum.pools] = async (address: Address): Promise<FeatureDto> => {
  //   const data = await this.sushiswapService.getDataByAddresses(address);
  //   const featureData = data.find((data) => data['liquidityPositions'])['liquidityPositions'][0];
  //
  //   if (featureData) {
  //     return {
  //       [FeatureEnum.pools]: featureData,
  //     };
  //   } else {
  //     return null;
  //   }
  // };
  //
  // public [FeatureEnum.transactions] = async (address: Address): Promise<FeatureDto> => {
  //   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //   // @ts-ignore
  //   const data = await this.sushiswapService.getDataByAddresses(address);
  //   const featureData = data.find((data) => data['txs'])['txs'];
  //
  //   if (featureData) {
  //     return {
  //       [FeatureEnum.transactions]: featureData,
  //     };
  //   } else {
  //     return null;
  //   }
  // };
  //
  // public [FeatureEnum.staking] = async (address: Address): Promise<FeatureDto> => {
  //   const data = await this.sushiswapService.getDataByAddresses(address);
  //   const featureData = data.find((data) => data['stakingPositions'])['stakingPositions'];
  //
  //   return {
  //     [FeatureEnum.staking]: featureData,
  //   };
  // };
}

export default SushiswapProtocolV2;
