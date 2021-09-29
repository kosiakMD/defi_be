import { plainToClass } from 'class-transformer';

import {
  Address,
  Borrowing,
  BorrowingPosition,
  ChainAbbrEnum,
  ChainIdEnum,
  FeatureResultDto,
  IntegrationFeaturesDataDto,
  Lending,
  LendingPosition,
  LiquidityPoolFeatureDto,
  LiquidityPosition,
  Logger,
  ProjectEnum,
  ProtocolName,
} from '@app/common';
import { BaseData, StakingErcToken } from '@app/common/dto/transactions.dto';

import { AccountService } from '../../../account/account.service';
import { LPToken, PoolTokenDto } from '../../../integrations/integrations.dto';
import { StakingPosition } from '../../../interfaces/staking.position.interfaces';
import { PoolToken } from '../../../interfaces/transactions.interfaces';
import { Mapper } from '../../../mappers/mapper';
import { PriceService } from '../../../price/price.service';
import { UniswapLikeSubgraph } from '../../../thegraph/uniswap-like-subgraph.service';
import { objectUpdate } from '../../../utils/object';
import { getUniqueAndToLowerCaseArrayData, groupBy } from '../../../utils/util';
import { FeatureEnum } from '../../features/features.enum';
import { ProtocolFeaturesInfo } from '../../protocol.types';
import { tokenDictionary } from '../../protocols.dictionaries';
import { DefaultDataProvider, FeatureHandleDto, RawFeaturesDto } from '../../protocols.dto';
import { BasicProtocol } from '../basicProtocol';

// <DataProvider extends DefaultDataProvider = DefaultDataProvider>

export abstract class UniswapLikeProtocol extends BasicProtocol {
  abstract readonly chains: ChainAbbrEnum[];
  abstract readonly project: ProjectEnum;
  abstract readonly name: ProtocolName;
  abstract readonly displayName: string;
  abstract readonly features: ProtocolFeaturesInfo;
  protected abstract readonly logger: Logger;
  protected abstract readonly accountService: AccountService;
  protected abstract readonly priceService: PriceService;
  protected abstract readonly dataProvider?: DefaultDataProvider | UniswapLikeSubgraph;
  protected readonly feeRate?: number;
  protected readonly mapper?: Mapper;

  protected constructor() {
    super();
    setTimeout(() => {
      if (this.dataProvider instanceof UniswapLikeSubgraph && !this.mapper) {
        throw new Error(
          `'${this.constructor.name}' extends 'UniswapLikeProtocol' wrong: No Mapper class as 'mapper' for the subgraph '${this.dataProvider.constructor.name}' is assigned`,
        );
      }
    });
  }

  // public getFeaturesInfo<T extends FeaturesType>(chainId?: ChainIdEnum): T {
  //   const abbr = ChainIdEnum[chainId];
  //   return chainId ? this.features[abbr] : this.features;
  // }

  // public getInfo(chainId?: ChainIdEnum): ProtocolBasicInfo {
  //   return {
  //     chains: this.chains,
  //     project: this.project,
  //     name: this.name,
  //     label: this.displayName,
  //     features: this.getFeaturesInfo(chainId),
  //   };
  // }

  public getAllFeaturesData = async (
    address: Address,
    chainId?: ChainIdEnum,
  ): Promise<IntegrationFeaturesDataDto> => {
    try {
      // result init
      const result = plainToClass(IntegrationFeaturesDataDto, {
        errors: [],
      } as IntegrationFeaturesDataDto);
      // all features data
      const { rawPools, rawStaking, rawLending, rawBorrowing } = await this.getAllFeaturesRawData(
        address,
        chainId,
      );
      // TODO: add method of handling feature and set into result
      await Promise.all([
        // result pools
        rawPools && this.handleResultPools(rawPools, result, chainId),
        // result staking
        rawStaking && this.handleResultStaking(rawStaking, result),
        // result lending
        rawLending && this.handleResultLending(rawLending, result),
        // result borrowing
        rawBorrowing && this.handleResultBorrowing(rawBorrowing, result),
      ]);
      // result errors handling
      result.errors = result.errors.flat(5); // TODO add staking errors

      return result;
    } catch (e) {
      this.logger.error(e, 'getAllFeaturesData');
      throw e;
    }
  };

  protected getAllFeaturesRawData = async (
    addresses: Address,
    chainId?: ChainIdEnum,
  ): Promise<RawFeaturesDto> => {
    try {
      const data = await this.getData(addresses, chainId);

      const rawPools = data.find((data) => data['liquidityPositions'])?.liquidityPositions;
      const rawStaking = data.find((data) => data['stakingPositions'])?.stakingPositions;
      const rawLending = data.find((data) => data['lendingPositions']);
      const rawBorrowing = data.find((data) => data['borrowingPositions']);

      return { rawPools, rawStaking, rawLending, rawBorrowing };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  };

  // side effect
  protected async handleResultPools(
    rawPools,
    result: IntegrationFeaturesDataDto,
    chainId: ChainIdEnum,
  ): Promise<void> {
    try {
      const { errors, data } = await this.transformPools(rawPools, chainId);
      result.errors.push(errors);
      result[FeatureEnum.pools] = data;
    } catch (e) {
      this.logger.error(e, 'handleResultPools');
      result.errors.push(e.message);
      result[FeatureEnum.pools] = null;
    }
  }

  // side effect
  protected async handleResultStaking(
    rawStaking,
    result: IntegrationFeaturesDataDto,
  ): Promise<void> {
    try {
      result[FeatureEnum.staking] = this.transformStaking(rawStaking);
    } catch (e) {
      this.logger.error(e, 'handleResultStaking');
      result.errors.push(e.message);
      result[FeatureEnum.staking] = null;
    }
  }

  // side effect
  protected async handleResultLending(
    rawLending,
    result: IntegrationFeaturesDataDto,
  ): Promise<void> {
    try {
      result[FeatureEnum.lending] = this.transformLending(rawLending);
    } catch (e) {
      this.logger.error(e, 'handleResultLending');
      result.errors.push(e.message);
      result[FeatureEnum.lending] = null;
    }
  }

  // side effect
  protected async handleResultBorrowing(
    rawBorrowing,
    result: IntegrationFeaturesDataDto,
  ): Promise<void> {
    try {
      result[FeatureEnum.borrowing] = this.transformBorrowing(rawBorrowing);
    } catch (e) {
      this.logger.error(e, 'handleResultBorrowing');
      result.errors.push(e.message);
      result[FeatureEnum.borrowing] = null;
    }
  }

  // get data from data providers

  protected async getData(addresses, chainId?) {
    let data;
    if (this.dataProvider instanceof UniswapLikeSubgraph) {
      data = await this.getSubgraphMappedData(addresses);
    } else {
      data = await this.dataProvider.getDataByAddresses(addresses, chainId);
    }
    return data;
  }

  protected async getSubgraphMappedData(addresses: Address): Promise<BaseData[]> {
    const originAddressesArray = addresses.split(',');
    const response = await this.getSubgraphData(
      originAddressesArray,
      this.dataProvider as UniswapLikeSubgraph,
    );
    const data = this.mapper.mapData(
      response.userAddresses,
      originAddressesArray,
      response.response,
      ProjectEnum.sushiswap,
    );
    return data;
  }

  protected async getSubgraphData(addresses: string[], subgraph: UniswapLikeSubgraph) {
    const addressesArray = getUniqueAndToLowerCaseArrayData(addresses);
    const flag = subgraph && subgraph.constructor.name === 'SushiswapSubgraph';
    const [liquidityPosition, stakingPositions] = await Promise.all([
      subgraph.getLiquidityPositions(addressesArray),
      flag ? subgraph.getStakingPositions(addressesArray) : null,
    ]);

    const uniswapLiquidityPositions = groupBy(
      liquidityPosition.data.liquidityPositions,
      (liquidityPosition) => liquidityPosition.user.id,
    );

    const sushiswapStakingPosition = flag
      ? groupBy(stakingPositions.data.users, (staking) => {
          const array = staking.id.split('-');
          return array[1];
        })
      : null;

    return {
      userAddresses: addressesArray,
      response: {
        uniswapLiquidityPositions,
        sushiswapStakingPosition,
      },
    };
  }

  // transforms
  protected transformStaking(rawStaking: StakingPosition[]): FeatureResultDto<StakingPosition> {
    try {
      const result: FeatureResultDto<StakingPosition> = {
        totalValue: 0,
        items: null,
      };

      rawStaking?.forEach((staking) => {
        // TODO: stakingToken is missed - need to fix to get it!
        if (staking?.stakingToken) {
          if (staking?.stakingToken.constructor.name === 'LPToken') {
            const lpToken = staking.stakingToken as LPToken;
            lpToken.tokens.forEach((token) => (result.totalValue += token.value));
            return;
          }
          const stakingToken = staking.stakingToken as StakingErcToken;
          result.totalValue += Number(stakingToken.value);
        }
      });

      result.items = rawStaking || [];
      return result;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  protected async transformPools(
    rawPools: LiquidityPosition[],
    chainId: ChainIdEnum,
  ): Promise<FeatureHandleDto<LiquidityPoolFeatureDto>> {
    const result = new FeatureHandleDto();

    // TODO first filter out value = 0, then handle filtered only!
    try {
      await this.handleMissedData(rawPools, chainId, result.errors);
    } catch (e) {
      this.logger.error(e);
      result.errors.push(e.message);
      throw e;
    }

    const outputPools: LiquidityPoolFeatureDto[] = rawPools?.reduce((resultArray, inputPool) => {
      const tokens: PoolTokenDto[] = [];
      let TVL = 0; // sum(reserve * price)
      let userValue = 0; // sum of values
      // Pool Tokens
      inputPool.poolTokens.forEach((token: PoolToken) => {
        const formattedToken = plainToClass(PoolTokenDto, {});
        objectUpdate(formattedToken, token, tokenDictionary, 'default');
        const { price, reserve, balance } = formattedToken;
        // value
        formattedToken.value = Number(balance) * price ?? null;
        // user
        userValue += formattedToken.value;
        // TVL
        if (reserve) {
          TVL += Number(reserve) * price;
        }

        tokens.push(formattedToken);
      });
      result.data.totalValue += userValue;
      // Pool
      const outPool: LiquidityPoolFeatureDto = plainToClass(LiquidityPoolFeatureDto, {
        address: inputPool.pool.address,
        name: inputPool.pool.name,
        lpToken: inputPool.lpToken,
        TVL: TVL,
        fee: {
          rate: this.feeRate,
        },
        user: {
          value: userValue,
          share: userValue / TVL,
        },
        // TODO need to add 1 more call to subgraph after pool data will be ready
        statistic: {
          day: {
            // volume: 1,
            // fee: 1,
          },
        },
        tokens: tokens,
      } as LiquidityPoolFeatureDto);

      if (outPool.user.value) {
        resultArray.push(outPool);
      }

      return resultArray;
    }, []);

    result.data.items = outputPools;

    return result;
  }

  protected transformLending(rawLending: Lending): FeatureResultDto<LendingPosition> {
    return this.getBasicFeatureResult<LendingPosition>(
      rawLending,
      'lendingPositions',
      'totalDepositDecimal',
    );
  }

  protected transformBorrowing(rawBorrowing: Borrowing): FeatureResultDto<BorrowingPosition> {
    return this.getBasicFeatureResult<BorrowingPosition>(
      rawBorrowing,
      'borrowingPositions',
      'totalDebtDecimal',
    );
  }
}

export default UniswapLikeProtocol;
