import { plainToClass } from 'class-transformer';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  ProjectEnum,
  ProtocolName,
} from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import { LiquidityPoolFeature, PoolTokenDto } from '@app/common/dto/liquidity.pool.dto';

import { ProtocolFeaturesInfo } from '../../../../common/types/protocol.types';
import { getUniqueAndToLowerCaseArrayData, groupBy } from '../../../../common/utils/util';

import { SubgraphResponseDto } from '../../../subgraphs/dto/subgraph.response.dto';
import { UniswapLikeSubgraph } from '../../../subgraphs/subgraphs/uniswap-like-subgraph.service';
import { RawFeaturesDto } from '../../dto/protocols.dto';
import { Mapper } from '../../helpers/mappers/mapper';
import { BasicProtocol } from '../basicProtocol';

export abstract class UniswapLikeProtocol extends BasicProtocol {
  abstract readonly chains: ChainAbbrEnum[];
  abstract readonly project: ProjectEnum;
  abstract readonly name: ProtocolName;
  abstract readonly displayName: string;
  abstract readonly features: ProtocolFeaturesInfo;
  protected abstract readonly logger: Logger;
  // protected abstract readonly accountService: AccountService;
  // protected abstract readonly priceService: PriceService;
  protected abstract readonly subgraph: UniswapLikeSubgraph;
  protected readonly mapper: Mapper;
  public readonly feeRate?: number;

  protected constructor() {
    super();
  }

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    let data: BaseData[];
    const errors: string[] = [];

    try {
      const response = await this.getSubgraphData(addresses, this.subgraph, chain.abbr);
      data = await this.mapper.mapData(
        response.userAddresses,
        addresses,
        response.response,
        this.project,
        this.name,
        chain,
      );

      data = data.map((d) => {
        const lpPosition: BaseDataLp = plainToClass(BaseDataLp, {
          chain: d.chain,
          projectName: d.projectName,
          protocolName: d.projectName,
          userAddress: d.userAddress,
          feature: FeatureEnum.pools,
          items: [],
        });

        d.liquidityPositions.forEach((lp) => {
          if (!lp.poolTokens.some((pt) => pt.amount === '0')) {
            const lpFeature: LiquidityPoolFeature = plainToClass(LiquidityPoolFeature, {
              address: lp.pool.address,
              lpToken: lp.lpToken,
              tokens: [],
            });

            lp.poolTokens.forEach((pt, i) => {
              const poolToken: PoolTokenDto = plainToClass(PoolTokenDto, {
                address: pt.address,
                name: pt.name,
                symbol: pt.symbol,
                decimals: pt.decimals,
                reserve: pt.reserve,
                value: pt.amount * pt.priceUSD,
                balance: pt.amount,
                price: pt.priceUSD,
                positionInPool: i,
              });

              lpFeature.tokens.push(poolToken);
            });
            lpPosition.items.push(lpFeature);
          }
        });

        return lpPosition;
      });
    } catch (e: any) {
      errors.push(e.message);
    }

    return [data, errors];
  }

  public getAllFeaturesRawData = async (
    addresses: Address,
    chain: ChainDto,
  ): Promise<RawFeaturesDto> => {
    try {
      const data = await this.getData(addresses, chain);

      const rawPools = data.find((data) => data['liquidityPositions'])?.liquidityPositions;
      const rawStaking = data.find((data) => data['stakingPositions'])?.stakingPositions;
      const rawLending = data.find((data) => data['lendingPositions']);
      const rawBorrowing = data.find((data) => data['borrowingPositions']);
      const rawLeverageFarming = data.find(
        (data) => data['leverageFarmingPositions'],
      )?.leverageFarmingPositions;

      return { rawPools, rawStaking, rawLending, rawBorrowing, rawLeverageFarming };
    } catch (e: any) {
      this.logger.error(e);
      throw e;
    }
  };

  protected async getData(addresses, chainId): Promise<BaseData[]> {
    return await this.getSubgraphMappedData(addresses, chainId);
  }

  protected async getSubgraphMappedData(addresses: Address, chain: ChainDto): Promise<BaseData[]> {
    const originAddressesArray = addresses.split(',');
    const response = await this.getSubgraphData(originAddressesArray, this.subgraph, chain.abbr);
    const data = this.mapper.mapData(
      response.userAddresses,
      originAddressesArray,
      response.response,
      this.project,
      this.name,
      chain,
    );
    return data;
  }

  protected getSubgraphData = async (
    addresses: string[],
    subgraph: UniswapLikeSubgraph,
    chainAbbr: ChainAbbrEnum,
  ) => {
    const features = this.features[chainAbbr];
    const addressesArray = getUniqueAndToLowerCaseArrayData(addresses);
    const getPools = features.includes(FeatureEnum.pools);
    const getStaking = features.includes(FeatureEnum.staking);

    const [poolsFetch, stakingFetch] = await Promise.all<SubgraphResponseDto>([
      getPools ? subgraph.getLiquidityPositions(addressesArray) : undefined,
      getStaking ? subgraph.getStakingPositions(addressesArray) : undefined,
    ]);

    // TODO add subgraph error handling here and in quickSwapProtocol
    if (poolsFetch?.errors?.length) {
      throw poolsFetch.errors[0];
    } else if (stakingFetch?.errors?.length) {
      throw stakingFetch.errors[0];
    }

    const subgraphPools = poolsFetch?.data?.liquidityPositions
      ? groupBy(
          poolsFetch.data.liquidityPositions,
          (liquidityPosition) => liquidityPosition.user.id,
        )
      : null;

    const subgraphStaking = stakingFetch?.data?.users
      ? groupBy(stakingFetch.data.users, (staking) => {
          const array = staking.id.split('-');
          return array[1];
        })
      : null;

    return {
      userAddresses: addressesArray,
      response: {
        subgraphPools,
        subgraphStaking,
      },
    };
  };
}

export default UniswapLikeProtocol;
