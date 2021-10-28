import { Address, ChainAbbrEnum, ChainDto, Logger, ProjectEnum, ProtocolName } from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';

import { SubgraphResponseDto } from '../../../subgraph/response.dto';
import { UniswapLikeSubgraph } from '../../../thegraph/uniswap-like-subgraph.service';
import { getUniqueAndToLowerCaseArrayData, groupBy } from '../../../utils/util';
import { FeatureEnum } from '../../features/features.enum';
import { ProtocolFeaturesInfo } from '../../protocol.types';
import { RawFeaturesDto } from '../../protocols.dto';
import { BasicProtocol } from '../basicProtocol';
import { Mapper } from '../mappers/mapper';

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
    } catch (e) {
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

    const subgraphPools = poolsFetch.data?.liquidityPositions
      ? groupBy(
          poolsFetch.data.liquidityPositions,
          (liquidityPosition) => liquidityPosition.user.id,
        )
      : null;

    const subgraphStaking = stakingFetch.data?.users
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
