import { plainToClass } from 'class-transformer';

import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Borrowing,
  BorrowingPosition,
  FeatureResultDto,
  IntegrationFeaturesDataDto,
  Lending,
  LendingPosition,
  LiquidityPoolFeatureDto,
  LiquidityPosition,
  Logger,
  ProtocolName,
  ResultStatus,
} from '@app/common';
import { StakingErcToken } from '@app/common/dto/transactions.dto';
import { ChainIdEnum } from '@app/common/enum';

import { AccountService } from '../account/account.service';
import { DetailedResponseDto } from '../dto';
import { CurrentPricesPayload, PriceResponseDto } from '../dto/price.response.dto';
import { LPToken, PoolTokenDto } from '../integrations/integrations.dto';
import { StakingPosition } from '../interfaces/staking.position.interfaces';
import { Asset, PoolToken } from '../interfaces/transactions.interfaces';
import { PriceService } from '../price/price.service';
import { objectUpdate } from '../utils/object';
import { ProtocolBasicInfo } from './features/features.dto';
import { FeatureEnum } from './features/features.enum';
import { tokenDictionary } from './protocols.dictionaries';
import { FeatureHandleDto, RawFeaturesDto } from './protocols.dto';
import AaveProtocolV2 from './protocols/aaveProtocolV2';
import AutofarmProtocol from './protocols/autofarmProtocol';
import BasicProtocol from './protocols/basicProtocol';
import PancakeProtocolV1 from './protocols/pancake/pancakeProtocolV1';
import QuickswapProtocol from './protocols/quickswapProtocol';
import SpookySwapProtocol from './protocols/spookyswapProtocol';
import PangolinProtocol from './protocols/uniswapLike/pangolinProtocol';
import SushiswapProtocolV2 from './protocols/uniswapLike/sushiswapProtocolV2';
import UniswapProtocolV2 from './protocols/uniswapLike/uniswapProtocolV2';
import UniswapProtocolV3 from './protocols/uniswapProtocolV3';

@Injectable()
export class ProtocolService {
  private readonly protocols: BasicProtocol[] = [];

  // TODO: to add a new Protocol just add it at ProtocolModule and at ProtocolService constructor
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly priceService: PriceService,
    private readonly aaveProtocolV2: AaveProtocolV2,
    private readonly uniswapProtocolV2: UniswapProtocolV2,
    private readonly uniswapProtocolV3: UniswapProtocolV3,
    private readonly sushiswapProtocolV2: SushiswapProtocolV2,
    private readonly pangolinProtocol: PangolinProtocol,
    private readonly pancakeProtocolV1: PancakeProtocolV1,
    private readonly quickswapProtocol: QuickswapProtocol,
    private readonly autofarmProtocol: AutofarmProtocol,
    private readonly spookySwapProtocol: SpookySwapProtocol,
  ) {
    this.protocols = [
      aaveProtocolV2,
      autofarmProtocol,
      pangolinProtocol,
      pancakeProtocolV1,
      quickswapProtocol,
      spookySwapProtocol,
      sushiswapProtocolV2,
      uniswapProtocolV2,
      uniswapProtocolV3,
    ];
  }

  public getAllProtocolsInfo(): ProtocolBasicInfo[] {
    return this.protocols.map((protocol) => {
      return protocol.getInfo();
    });
  }

  public getProtocol(): BasicProtocol[] {
    return this.protocols;
  }

  public getProtocolByName(protocolName: ProtocolName): BasicProtocol {
    return this.protocols.find((protocol) => protocol.name === protocolName);
  }

  public async getProtocolFeatures(
    protocolName: ProtocolName,
    addresses: string,
    chainId: ChainIdEnum,
  ): Promise<IntegrationFeaturesDataDto> {
    const protocol = this.getProtocolByName(protocolName);
    if (!protocol) {
      throw new NotImplementedException(`Protocol '${protocolName}' is not supported yet`);
    }
    if (protocol.getAllFeaturesData) {
      return await protocol.getAllFeaturesData(addresses, chainId);
    } else {
      const featuresData = await protocol.getAllFeaturesRawData(addresses, chainId);
      return await this.formatFeaturesData(featuresData, chainId, protocol);
    }
  }

  private async postprocessing() {}

  private async formatFeaturesData(
    featuresData: RawFeaturesDto,
    chainId: ChainIdEnum,
    protocol: BasicProtocol,
  ): Promise<IntegrationFeaturesDataDto> {
    try {
      // result init
      const result = plainToClass(IntegrationFeaturesDataDto, {
        errors: [],
      } as IntegrationFeaturesDataDto);
      // all features data
      const { rawPools, rawStaking, rawLending, rawBorrowing } = featuresData;
      // TODO: add method of handling feature and set into result
      await Promise.all([
        // result pools
        rawPools && this.handleResultPools(rawPools, result, chainId, protocol),
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
      this.logger.error(e, 'formatFeaturesData');
      throw e;
    }
  }

  // side effect
  protected async handleResultPools(
    rawPools,
    result: IntegrationFeaturesDataDto,
    chainId: ChainIdEnum,
    protocol: BasicProtocol,
  ): Promise<void> {
    try {
      const { errors, data } = await this.transformPools(rawPools, chainId, protocol);
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
    protocol: BasicProtocol,
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
      const rewards: PoolTokenDto[] = [];
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

      inputPool.rewards?.forEach((token: PoolToken) => {
        const formattedToken = plainToClass(PoolTokenDto, {
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          reserve: token.reserve,
          price: token.priceUSD,
          decimals: token.decimals,
          balance: token.amount,
          value:
            Number(token.amount) && token.priceUSD ? Number(token.amount) * token.priceUSD : null,
        });
        // user
        userValue += formattedToken.value;

        rewards.push(formattedToken);
      });

      result.data.totalValue += userValue;
      // Pool
      const outPool: LiquidityPoolFeatureDto = plainToClass(LiquidityPoolFeatureDto, {
        address: inputPool.pool.address,
        name: inputPool.pool.name,
        lpToken: inputPool.lpToken,
        TVL: TVL,
        fee: {
          rate: protocol.feeRate,
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
        rewards: rewards.length ? rewards : undefined,
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

  protected getBasicFeatureResult<T>(
    data: Borrowing | Lending,
    rootKey: string,
    totalKey: string,
  ): FeatureResultDto<T> {
    const result = {
      totalValue: 0,
      items: data?.[rootKey] ?? [],
    };

    if (data) {
      data[rootKey].forEach((cur) => {
        result.totalValue += cur[totalKey] * cur.token.priceUSD;
      });
    }

    return result;
  }
  protected async handleMissedData(
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
    rawPools?.forEach((inputPool) => {
      pools.push(inputPool.lpToken.address);
      inputPool.poolTokens.forEach((token: PoolToken) => {
        const { address, name, symbol, decimals, priceUSD } = token;
        if (!name || !symbol || !decimals) {
          groupTokens(tokensMissedData, address, token);
        }
        // TODO: `priceUSD = null` always
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
