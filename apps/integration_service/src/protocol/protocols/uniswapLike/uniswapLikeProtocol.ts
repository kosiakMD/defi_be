import {
  Address,
  ChainAbbrEnum,
  ChainIdEnum,
  Logger,
  ProjectEnum,
  ProtocolName,
} from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';

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
    chainId: ChainIdEnum,
  ): Promise<RawFeaturesDto> => {
    try {
      const data = await this.getData(addresses, chainId);

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

  protected async getData(addresses, chainId) {
    return await this.getSubgraphMappedData(addresses, chainId);
  }

  protected async getSubgraphMappedData(
    addresses: Address,
    chainId: ChainIdEnum,
  ): Promise<BaseData[]> {
    const originAddressesArray = addresses.split(',');
    const response = await this.getSubgraphData(originAddressesArray, this.subgraph, chainId);
    const data = this.mapper.mapData(
      response.userAddresses,
      originAddressesArray,
      response.response,
      this.project,
      this.name,
      chainId,
    );
    return data;
  }

  protected getSubgraphData = async (
    addresses: string[],
    subgraph: UniswapLikeSubgraph,
    chainId: ChainIdEnum,
  ) => {
    const chainAbbr = ChainIdEnum[chainId];

    const features = this.features[chainAbbr];
    const addressesArray = getUniqueAndToLowerCaseArrayData(addresses);
    const getPools = features.includes(FeatureEnum.pools);
    const getStaking = features.includes(FeatureEnum.staking);

    const [poolsFetch, stakingFetch] = await Promise.all([
      getPools ? subgraph.getLiquidityPositions(addressesArray) : undefined,
      getStaking ? subgraph.getStakingPositions(addressesArray) : undefined,
    ]);

    const subgraphPools = getPools
      ? groupBy(
          poolsFetch.data.liquidityPositions,
          (liquidityPosition) => liquidityPosition.user.id,
        )
      : null;

    const subgraphStaking = getStaking
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
