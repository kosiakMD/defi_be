import { plainToClass } from 'class-transformer';

import {
  ChainAbbrEnum,
  ChainIdEnum,
  ProjectEnum,
  ProtocolName,
  ResultStatus,
} from '../../common/enum';
import { Address } from '../../common/types';

import { Logger } from '../../Logger/Logger.service';
import { AccountService } from '../../account/account.service';
import { DetailedResponseDto } from '../../dto';
import { LiquidityPosition } from '../../dto/liquidity.position.dto';
import { CurrentPricesPayload, PriceResponseDto } from '../../dto/price.response.dto';
import {
  IntegrationFeaturesData,
  IntegrationFeaturesDataDto,
  LiquidityPoolFeature,
  LPToken,
  PoolTokenDto,
} from '../../integrations/integrations.dto';
import {
  Asset,
  BaseData,
  PoolToken,
  StakingErcToken,
  StakingPosition,
} from '../../interfaces/transactions.interfaces';
import { Mapper } from '../../mappers/mapper';
import { PriceService } from '../../price/price.service';
import { UniswapLikeSubgraph } from '../../thegraph/uniswap-like-subgraph.service';
import { objectUpdate } from '../../utils/object';
import { getUniqueAndToLowerCaseArrayData, groupBy } from '../../utils/util';
import { ProtocolBasicInfo } from '../features/features.dto';
import { FeatureEnum } from '../features/features.enum';
import { FeatureResultDto } from '../features/features.types';
import { FeaturesType, ProtocolFeaturesInfo } from '../protocol.types';
import { tokenDictionary } from '../protocols.dictionaries';
import { DefaultDataProvider, FeatureHandleDto, RawFeaturesDto } from '../protocols.dto';
import AbstractProtocol from './abstractProtocol';

export abstract class BasicProtocol<
  DataProvider extends DefaultDataProvider = DefaultDataProvider,
> extends AbstractProtocol {
  abstract readonly chains: ChainAbbrEnum[];
  abstract readonly project: ProjectEnum;
  abstract readonly name: ProtocolName;
  abstract readonly displayName: string;
  abstract readonly features: ProtocolFeaturesInfo;
  // TODO non mandatory
  protected abstract readonly accountService: AccountService;
  protected abstract readonly priceService: PriceService;
  protected abstract readonly feeRate: number;
  protected abstract readonly logger: Logger;
  protected abstract readonly dataProvider?: DataProvider | UniswapLikeSubgraph;
  protected readonly mapper: Mapper;

  constructor() {
    super();
  }

  public getFeaturesInfo<T extends FeaturesType>(chainId?: ChainIdEnum): T {
    const abbr = ChainIdEnum[chainId];
    return chainId ? this.features[abbr] : this.features;
  }

  public getInfo(chainId?: ChainIdEnum): ProtocolBasicInfo {
    return {
      chains: this.chains,
      project: this.project,
      name: this.name,
      label: this.displayName,
      features: this.getFeaturesInfo(chainId),
    };
  }

  public getAllFeaturesData = async (
    address: Address,
    chainId?: ChainIdEnum,
  ): Promise<IntegrationFeaturesData> => {
    let pools, poolsErrors;
    const { rawPools, rawStaking } = await this.getAllFeaturesRawData(address, chainId);
    try {
      const { errors, data } = await this.transformPools(rawPools, chainId);
      poolsErrors = errors;
      pools = data;
    } catch (e) {
      poolsErrors = e;
      pools = null;
    }
    let staking, stakingErrors;
    try {
      staking = this.transformStaking(rawStaking);
    } catch (e) {
      stakingErrors = e;
      staking = null;
    }
    // console.log('rawStaking', rawStaking);
    const result = new IntegrationFeaturesDataDto();
    result.errors = [poolsErrors, stakingErrors].flat(5); // TODO add staking errors
    result[FeatureEnum.pools] = pools;
    result[FeatureEnum.staking] = staking;

    return result;
  };

  protected getAllFeaturesRawData = async (
    addresses: Address,
    chainId?: ChainIdEnum,
  ): Promise<RawFeaturesDto> => {
    try {
      const data = await this.getData(addresses, chainId);
      const rawPools = data.find((data) => data['liquidityPositions'])?.liquidityPositions;
      const rawStaking = data.find((data) => data['stakingPositions'])?.stakingPositions;
      // TODO: feature transaction is disabled
      // const transactions = data.find((data) => data['transactions']);

      return { rawPools, rawStaking };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  };

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

  // side effects
  private async handleMissedData(
    rawPools: LiquidityPosition[],
    chainId: ChainIdEnum,
    errors,
  ): Promise<void> {
    const tokensMissedData: Map<string, PoolToken[]> = new Map();
    const tokensMissedPrice: Map<string, PoolToken[]> = new Map();
    const pools: string[] = [];

    const groupTokens = (map, address, token): void => {
      const list = map.get(address);
      if (list) {
        list.push(token);
      } else {
        map.set(address, [token]);
      }
    };
    // console.log(rawPools);
    rawPools?.forEach((inputPool) => {
      pools.push(inputPool.lpToken.address);
      inputPool.poolTokens.forEach((token: PoolToken) => {
        const { address, name, symbol, decimals, priceUSD } = token;
        if (!name || !symbol || !decimals) {
          groupTokens(tokensMissedData, address, token);
        }
        if (!priceUSD) {
          groupTokens(tokensMissedPrice, address, token);
        }
      });
    });
    if (pools.length && (tokensMissedData.size || tokensMissedPrice.size)) {
      let tokensRequest;
      if (tokensMissedData.size) {
        const addresses: string[] = Array.from(tokensMissedData.keys()).concat(pools);
        tokensRequest = this.getAllTokenInfo(addresses, [chainId]);
      }
      let pricesRequest;
      if (tokensMissedPrice.size) {
        const addresses: string[] = Array.from(tokensMissedPrice.keys());
        pricesRequest = this.getAllTokenPrices(addresses, chainId);
      }
      type Response = DetailedResponseDto<Asset[]> | PriceResponseDto<CurrentPricesPayload>;
      const requests = [tokensRequest, pricesRequest];
      const [tokens, prices] = await Promise.allSettled<Response>(requests);

      if (tokensRequest) {
        if (tokens.status === 'fulfilled') {
          const tokensData = tokens.value as DetailedResponseDto<Asset[]>;
          if (tokensData.status === ResultStatus.ok) {
            const lpTokens = tokensData.data.slice(-pools.length);
            const fullTokens = tokensData.data.slice(0, tokensData.data.length - pools.length);

            lpTokens.forEach((lpToken, index) => {
              // const index = lpToken.address;
              const poolData = rawPools[index];
              const lpTokenToUpdate = poolData.lpToken;
              poolData.pool.name = lpToken.name;
              objectUpdate(lpTokenToUpdate, lpToken, 'fill');
            });
            fullTokens.forEach((fullToken) => {
              const tokensToUpdate = tokensMissedData.get(fullToken.address);
              tokensToUpdate.forEach((tokenToUpdate) => {
                objectUpdate(tokenToUpdate, fullToken /*tokenDictionary*/);
              });
            });
          } else {
            this.logger.error(tokensData.errors);
            errors.push(tokensData.errors);
          }
        } else {
          this.logger.error(tokens.reason);
          errors.push(tokens.reason.message);
        }
      }

      if (pricesRequest) {
        if (prices.status === 'fulfilled') {
          const pricesData = prices.value as PriceResponseDto<CurrentPricesPayload>;

          const tokensPrices = pricesData?.prices || [];

          Object.entries(tokensPrices).forEach(([address, price]) => {
            const tokensToUpdate = tokensMissedPrice.get(address);
            tokensToUpdate.forEach((tokenToUpdate) => {
              tokenToUpdate.priceUSD = price;
            });
          });
        } else {
          this.logger.error(prices.reason);
          errors.push(prices.reason.message);
        }
      }
    }
  }

  protected transformStaking(rawStaking: StakingPosition[]): FeatureResultDto<StakingPosition> {
    const result: FeatureResultDto<StakingPosition> = {
      totalValue: 0,
      items: null,
    };

    rawStaking?.forEach((staking) => {
      if (staking.stakingToken.constructor.name === 'LPToken') {
        const lpToken = staking.stakingToken as LPToken;
        lpToken.tokens.forEach((token) => (result.totalValue += token.value));
        return;
      }
      const stakingToken = staking.stakingToken as StakingErcToken;
      result.totalValue += Number(stakingToken.value);
    });

    result.items = rawStaking || [];
    return result;
  }

  protected async transformPools(
    rawPools: LiquidityPosition[],
    chainId: ChainIdEnum,
  ): Promise<FeatureHandleDto<LiquidityPoolFeature>> {
    const result = new FeatureHandleDto();

    try {
      await this.handleMissedData(rawPools, chainId, result.errors);
    } catch (e) {
      this.logger.error(e);
      result.errors.push(e.message);
    }

    const outputPools: LiquidityPoolFeature[] = rawPools?.map((inputPool) => {
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
      const outPool: LiquidityPoolFeature = plainToClass(LiquidityPoolFeature, {
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
      } as LiquidityPoolFeature);

      return outPool;
    });

    result.data.items = outputPools?.filter((pool) => pool.user.value);

    return result;
  }

  private async getAllTokenInfo(
    addresses: string[],
    chainIds: ChainIdEnum[],
  ): Promise<DetailedResponseDto<Asset[]>> {
    try {
      return await this.accountService.getAssets(addresses, chainIds);
    } catch (e) {
      this.logger.error(e);
      if (e.message.startsWith('connect ECONNREFUSED')) {
        throw new Error('connect ECONNREFUSED Asset Service');
      } else {
        throw new Error('GetAllTokenInfoError: \n ' + e);
      }
    }
  }

  private async getAllTokenPrices(
    addresses: string[],
    chainId: ChainIdEnum,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    try {
      return await this.priceService.getTokenPrices(addresses, chainId);
    } catch (e) {
      this.logger.error(e);
      if (e.message.startsWith('connect ECONNREFUSED')) {
        throw new Error('connect ECONNREFUSED Price Service');
      } else {
        throw new Error('getAllTokenPrices: \n ' + e);
      }
    }
  }
}

export default BasicProtocol;
