import { plainToClass } from 'class-transformer';

import {
  Address,
  ChainAbbrEnum,
  ChainIdEnum,
  ProjectEnum,
  ProtocolName,
  ResultStatus,
} from '@app/common';
import { StakingErcToken } from '@app/common/dto/transactions.dto';

import { Logger } from '../../Logger/Logger.service';
import { AccountService } from '../../account/account.service';
import { DetailedResponseDto } from '../../dto';
import { CurrentPricesPayload, PriceResponseDto } from '../../dto/price.response.dto';
import {
  IntegrationFeaturesData,
  LiquidityPoolFeature,
  LPToken,
  PoolTokenDto,
} from '../../integrations/integrations.dto';
import { Staking, StakingPosition } from '../../interfaces/staking.position.interfaces';
import { Asset, AutomaticMarketMaker, PoolToken } from '../../interfaces/transactions.interfaces';
import { PriceService } from '../../price/price.service';
import { objectUpdate } from '../../utils/object';
import { ProtocolBasicInfo } from '../features/features.dto';
import { FeatureEnum } from '../features/features.enum';
import { FeatureResult } from '../features/features.types';
import { FeaturesType, ProtocolFeaturesInfo } from '../protocol.types';
import { tokenDictionary } from '../protocols.dictionaries';
import { DefaultDataProvider } from '../protocols.dto';
import AbstractProtocol from './abstractProtocol';

export abstract class BasicProtocol<
  DataProvider extends DefaultDataProvider = DefaultDataProvider,
> extends AbstractProtocol<DataProvider> {
  abstract readonly chains: ChainAbbrEnum[];
  abstract readonly project: ProjectEnum;
  abstract readonly name: ProtocolName;
  abstract readonly label: string;
  protected abstract readonly features: ProtocolFeaturesInfo;
  // TODO non mandatory
  protected abstract readonly dataProvider?: DataProvider;
  protected abstract readonly accountService: AccountService;
  protected abstract readonly priceService: PriceService;
  protected abstract readonly feeRate: number;
  protected abstract readonly logger: Logger;

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
      label: this.label,
      features: this.getFeaturesInfo(chainId),
    };
  }

  public getAllFeaturesData = async (
    address: Address,
    chainId?: ChainIdEnum,
  ): Promise<IntegrationFeaturesData> => {
    let data;
    try {
      data = await this.dataProvider.getDataByAddresses(address, chainId);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }

    const rawPools = data.find((data) => data['liquidityPositions']);
    const rawStaking = data.find((data) => data['stakingPositions']);
    const { errors: poolsErrors, data: pools } = await this.transformPools(rawPools, chainId);
    const staking = this.transformStaking(rawStaking);
    return {
      errors: poolsErrors,
      [FeatureEnum.pools]: pools,
      [FeatureEnum.staking]: staking,
      // TODO: feature transaction is disabled
      // [FeatureEnum.transactions]: transactions,
    };
  };

  // side effects
  private async handleMissedData(
    inputPoolsData: AutomaticMarketMaker,
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

    inputPoolsData?.liquidityPositions?.forEach((inputPool) => {
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
    if (pools.length || tokensMissedData.size || tokensMissedPrice.size) {
      let tokensRequest;
      if (pools.length || tokensMissedData.size) {
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
              const poolData = inputPoolsData.liquidityPositions[index];
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
            tokensData.errors.map((err) => this.logger.error(err));
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
          errors.push(prices.reason);
        }
      }
    }
  }

  protected transformStaking(rawStaking: Staking): FeatureResult<StakingPosition> {
    try {
      const result: FeatureResult<StakingPosition> = {
        totalValue: 0,
        items: null,
      };

      rawStaking?.stakingPositions.forEach((staking) => {
        // TODO: stakingToken is missed - need to fix to get it!
        if (staking?.stakingToken) {
          if (staking.stakingToken.constructor?.name === 'LPToken') {
            const lpToken = staking.stakingToken as LPToken;
            lpToken.tokens.forEach((token) => (result.totalValue += token.value));
            return;
          }
          const stakingToken = staking.stakingToken as StakingErcToken;
          result.totalValue += Number(stakingToken.value);
        }
      });

      result.items = rawStaking?.stakingPositions || [];
      return result;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  protected async transformPools(
    inputPoolsData: AutomaticMarketMaker,
    chainId: ChainIdEnum,
  ): Promise<{ errors: any[]; data: FeatureResult<LiquidityPoolFeature> }> {
    const result = {
      errors: [] as any[],
      data: {
        totalValue: 0,
        items: [],
      } as FeatureResult<LiquidityPoolFeature>,
    };

    try {
      await this.handleMissedData(inputPoolsData, chainId, result.errors);
    } catch (e) {
      this.logger.error(e);
      result.errors.push(e.message);
      throw e;
    }

    const outputPools: LiquidityPoolFeature[] = inputPoolsData?.liquidityPositions.reduce(
      (resultArray, inputPool) => {
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

        if (outPool.user.value) {
          resultArray.push(outPool);
        }

        return resultArray;
      },
      [],
    );
    result.data.items = outputPools;

    return result;
  }

  private getAllTokenInfo(
    addresses: string[],
    chainIds: ChainIdEnum[],
  ): Promise<DetailedResponseDto<Asset[]>> {
    try {
      return this.accountService.getAssets(addresses, chainIds);
    } catch (e) {
      this.logger.error(e);
      throw new Error('GetAllTokenInfoError: \n ' + e);
    }
  }

  private getAllTokenPrices(
    addresses: string[],
    chainId: ChainIdEnum,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    try {
      return this.priceService.getTokenPrices(addresses, chainId);
    } catch (e) {
      this.logger.error(e);
      throw new Error('GetAllTokenInfoError: \n ' + e);
    }
  }
}

export default BasicProtocol;
