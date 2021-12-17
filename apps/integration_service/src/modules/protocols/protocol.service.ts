import { plainToClass } from 'class-transformer';

import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  AlpacaProtocolEnum,
  AutofarmProtocolEnum,
  Borrowing,
  ChainDto,
  ChainId,
  FeatureEnum,
  FeatureResultDto,
  Features,
  IntegrationFeaturesDataDto,
  Lending,
  LendingPositionDto,
  LeverageFarmingPosition,
  LiquidityPoolFeatureDto,
  LiquidityPosition,
  Logger,
  PancakeProtocolEnum,
  ProtocolName,
  QuickswapProtocolEnum,
  ResultStatus,
  SpookySwapProtocolEnum,
} from '@app/common';
import { BaseDataLending } from '@app/common/dto/base.data.lending.dto';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { BaseLeverageFarming } from '@app/common/dto/base.leverage.farming.dto';
import { ChainIdEnum } from '@app/common/enum';
import { UnderlyingStakingLp } from '@app/common/jobs/staking';

import { DetailedResponseDto } from '../../common/dto';
import {
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
  PoolTokenDto,
} from '../../common/dto';
import { CurrentPricesPayload, PriceResponseDto } from '../../common/dto';
import { Asset, BaseData, PoolToken } from '../../common/interfaces/transactions.interfaces';
import { objectUpdate } from '../../common/utils/object';

import { ProtocolBasicInfo } from '../integrations/dto/features.dto';
import { AccountService } from '../microservices/account.service';
import { PriceService } from '../microservices/price.service';
import { FeatureHandleDto, RawFeaturesDto } from './dto/protocols.dto';
import { tokenDictionary } from './helpers/protocols.dictionaries';
import AaveProtocolV2 from './protocols/aaveProtocolV2';
import { alpacaDebtTokens } from './protocols/alpaca/contracts/alpaca.abi';
import AlpacaProtocol from './protocols/alpacaProtocol';
import AutofarmProtocol from './protocols/autofarmProtocol';
import BasicProtocol from './protocols/basicProtocol';
import EllipsisProtocol from './protocols/ellipsis/ellipsis.protocol';
import PancakeProtocol from './protocols/pancake/pancake.protocol';
import PancakeProtocolV1 from './protocols/pancake/pancake.protocol.v1';
import QuickswapProtocol from './protocols/quickswap/quickswapProtocol';
import RaydiumProtocol from './protocols/raydium/raydium.protocol';
import SpookySwapProtocol from './protocols/spookyswap/spookyswapProtocol';
import SushiswapProtocolV2 from './protocols/sushiswapProtocolV2';
import TraderJoeProtocol from './protocols/traderjoe/trader-joe.protocol';
import PangolinProtocol from './protocols/uniswapLike/pangolinProtocol';
import UniswapProtocolV2 from './protocols/uniswapLike/uniswapProtocolV2';
import UniswapProtocolV3 from './protocols/uniswapProtocolV3';
import YearnProtocolV1 from './protocols/yearnProtocolV1';
import YearnProtocolV2 from './protocols/yearnProtocolV2';
import ViperswapProtocol from './protocols/viperswap/viperswap.protocol';

@Injectable()
export class ProtocolService {
  private readonly protocols: BasicProtocol[] = [];

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly priceService: PriceService,
    private readonly aaveProtocolV2: AaveProtocolV2,
    private readonly uniswapProtocolV2: UniswapProtocolV2,
    private readonly uniswapProtocolV3: UniswapProtocolV3,
    private readonly sushiswapProtocolV2: SushiswapProtocolV2,
    private readonly pangolinProtocol: PangolinProtocol,
    private readonly pancakeProtocolV2: PancakeProtocol,
    private readonly quickswapProtocol: QuickswapProtocol,
    private readonly autofarmProtocol: AutofarmProtocol,
    private readonly spookySwapProtocol: SpookySwapProtocol,
    private readonly alpacaProtocol: AlpacaProtocol,
    private readonly yearnProtocolV1: YearnProtocolV1,
    private readonly yearnProtocolV2: YearnProtocolV2,
    private readonly traderjoeProtocol: TraderJoeProtocol,
    private readonly ellipsisProtocol: EllipsisProtocol,
    private readonly raydiumProtocol: RaydiumProtocol,
    private readonly pancakeProtocolV1: PancakeProtocolV1,
    private readonly viperswapProtocol: ViperswapProtocol,
  ) {
    this.protocols = [
      aaveProtocolV2,
      alpacaProtocol,
      autofarmProtocol,
      pancakeProtocolV2,
      pangolinProtocol,
      quickswapProtocol,
      spookySwapProtocol,
      sushiswapProtocolV2,
      uniswapProtocolV2,
      uniswapProtocolV3,
      yearnProtocolV1,
      yearnProtocolV2,
      traderjoeProtocol,
      ellipsisProtocol,
      raydiumProtocol,
      pancakeProtocolV1,
      viperswapProtocol,
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
    chain: ChainDto,
  ): Promise<IntegrationFeaturesDataDto> {
    const protocol: BasicProtocol = this.getProtocolByName(protocolName);
    if (!protocol) {
      throw new NotImplementedException(`Protocol '${protocolName}' is not supported yet`);
    }

    if (protocol.getAllFeaturesData) {
      return await protocol.getAllFeaturesData(addresses, chain);
    } else {
      const featuresData = await protocol.getAllFeaturesRawData(addresses, chain);
      return await this.formatFeaturesData(featuresData, chain.id, protocol);
    }
  }

  private async formatFeaturesData(
    featuresData: RawFeaturesDto,
    chainId: ChainId,
    protocol: BasicProtocol,
  ): Promise<IntegrationFeaturesDataDto> {
    try {
      // result init
      const result = plainToClass(IntegrationFeaturesDataDto, {
        errors: [],
      } as IntegrationFeaturesDataDto);
      // all features data
      const { rawPools, rawStaking, rawLending, rawBorrowing, rawLeverageFarming } = featuresData;
      // TODO: add method of handling feature and set into result
      await Promise.all([
        // result pools
        rawPools && this.handleResultPools(rawPools, result, chainId, protocol),
        // result staking
        rawStaking && this.handleResultStaking(rawStaking, result, chainId, protocol),
        // result lending
        rawLending && this.handleResultLending(rawLending, result),
        // result borrowing
        rawBorrowing && this.handleResultLending(rawBorrowing, result),
        // result leverageFarming
        rawLeverageFarming && this.handleResultLeverageFarming(rawLeverageFarming, result),
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
    rawPools: LiquidityPosition[],
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
    chainId: ChainId,
    protocol: BasicProtocol,
  ): Promise<void> {
    try {
      result[FeatureEnum.staking] = await this.transformStaking(rawStaking, chainId, protocol);
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

  protected async handleResultLeverageFarming(
    rawLeverageFarming,
    result: IntegrationFeaturesDataDto,
  ): Promise<void> {
    try {
      result[FeatureEnum.leverageFarming] = this.transformLeverageFarming(rawLeverageFarming);
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

  protected transformLeverageFarming(
    rawLeverageFarming: LeverageFarmingPosition[],
  ): FeatureResultDto<LeverageFarmingPosition> {
    const result: FeatureResultDto<LeverageFarmingPosition> = {
      totalValue: 0,
      items: null,
    };

    rawLeverageFarming?.forEach((farming) => {
      result.totalValue += Number(farming.earned);
    });

    result.items = rawLeverageFarming || [];
    return result;
  }

  // transforms
  protected async transformStaking(
    stakingPositions: IntegrationStakingPositionDto[],
    chainId: ChainId,
    protocol: BasicProtocol,
  ): Promise<FeatureResultDto<IntegrationStakingPositionDto>> {
    const result: FeatureResultDto<IntegrationStakingPositionDto> = {
      totalValue: 0,
      items: null,
      errors: [],
    };

    try {
      if (
        // better to avoid this kostil :)
        protocol.name !== AlpacaProtocolEnum.alpaca &&
        protocol.name !== AutofarmProtocolEnum.autofarm &&
        protocol.name !== SpookySwapProtocolEnum.SpookySwap &&
        protocol.name !== PancakeProtocolEnum.pancakeV2 &&
        protocol.name !== QuickswapProtocolEnum.quickswap
      ) {
        await this.handleStakingMissedData(stakingPositions, chainId);
      }
    } catch (e) {
      this.logger.error(e);
      result.errors.push(e.message);
      throw e;
    }

    stakingPositions?.forEach((sp) => {
      if (sp.stakingToken.tokens) {
        sp.stakingToken.tokens.forEach((spt) => {
          result.totalValue = result.totalValue + spt.value;
        });
      } else {
        result.totalValue = result.totalValue + sp.stakingToken.value;
      }
      result.totalValue = result.totalValue + Number(sp.rewardToken.claimableData.value);
    });

    result.items = stakingPositions || [];
    return result;
  }

  protected async transformPools(
    rawPools: LiquidityPosition[],
    chainId: ChainIdEnum,
    protocol: BasicProtocol,
  ): Promise<FeatureHandleDto<LiquidityPoolFeatureDto>> {
    const result: FeatureHandleDto<LiquidityPoolFeatureDto> = new FeatureHandleDto();

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
        formattedToken.balance = token['balance'] ? token['balance'] : formattedToken.balance;
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
        address: inputPool.pool ? inputPool.pool.address : inputPool['address'],
        name: inputPool.pool?.name,
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

  protected transformLending(rawLending: Lending): FeatureResultDto<LendingPositionDto> {
    return this.getBasicFeatureResult<LendingPositionDto>(
      rawLending,
      'lendingPositions',
      'balance',
    );
  }

  protected transformBorrowing(rawBorrowing: Borrowing): FeatureResultDto<LendingPositionDto> {
    return this.getBasicFeatureResult<LendingPositionDto>(
      rawBorrowing,
      'borrowingPositions',
      'totalDebtDecimal',
    );
  }

  protected getBasicFeatureResult<T extends Features>(
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
        result.totalValue += cur[totalKey] * cur.token.price;
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
      if (inputPool.poolTokens) {
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
      }
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
      const [tokensResponse, pricesResponse] = await Promise.allSettled<Response>(requests);

      if (tokensRequest) {
        if (tokensResponse.status === 'fulfilled') {
          const tokensData = tokensResponse.value as DetailedResponseDto<Asset[]>;
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
            this.logger.error(tokensData?.errors);
            errors.push(tokensData?.errors);
          }
        } else {
          this.logger.error(tokensResponse.reason);
          errors.push(tokensResponse.reason.message);
        }
      }

      if (pricesRequest) {
        if (pricesResponse.status === 'fulfilled') {
          const pricesData = pricesResponse.value as PriceResponseDto<CurrentPricesPayload>;

          const tokensPrices = pricesData?.prices || [];

          Object.entries(tokensPrices).forEach(([address, price]) => {
            const tokensToUpdate = tokensMissedPrice.get(address);
            tokensToUpdate.forEach((tokenToUpdate) => {
              tokenToUpdate.priceUSD = price;
            });
          });
        } else {
          this.logger.error(pricesResponse.reason);
          errors.push(pricesResponse.reason.message);
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
    addresses: Address[],
    chainId: ChainIdEnum,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    try {
      return await this.priceService.getTokenPricesFetch(addresses, chainId);
    } catch (e) {
      this.logger.error(e);
      if (e.message.startsWith('connect ECONNREFUSED')) {
        throw new Error('connect ECONNREFUSED Price Service');
      } else {
        throw new Error('getAllTokenPrices: \n ' + e);
      }
    }
  }

  private async handleStakingMissedData(
    stakingPositions: IntegrationStakingPositionDto[],
    chainId: ChainId,
  ) {
    const tokensToFetchPrice: Map<Address, PoolTokenDto | IntegrationERC20TokenDto> = new Map();
    const addressesToFetchPrice: Address[] = [];
    // add reward Token
    const rewardTokenAddress = stakingPositions[0]?.rewardToken.address;
    addressesToFetchPrice.push(rewardTokenAddress);
    // add pool tokens
    stakingPositions?.forEach(({ stakingToken }) => {
      const { tokens, address: stakingAddress } = stakingToken;
      addressesToFetchPrice.push(stakingAddress);
      tokensToFetchPrice.set(stakingAddress, stakingToken);
      tokens?.forEach((token) => {
        addressesToFetchPrice.push(token.address);
        tokensToFetchPrice.set(token.address, token);
      });
    });
    // fetch all tokens prices
    const tokensPrices = await this.priceService.getTokenPricesFetch(
      addressesToFetchPrice,
      chainId,
    );
    // handle reward token price
    const rewardTokenPrice = tokensPrices.prices[rewardTokenAddress];
    // to avoid set in to Map of ordinary tokens
    delete tokensPrices.prices[rewardTokenAddress];
    // handle staking and pool tokens prices
    // Object.entries(tokensPrices.prices).forEach(([address, price]) => {
    //   const token = tokensToFetchPrice.get(address);
    //   token.price = Number(price) || null;
    //   token.value = Number(token.price) * Number(token.balance) || null;
    // });
    // handle reward and staking tokens prices and values
    stakingPositions.forEach(({ rewardToken, stakingToken }) => {
      rewardToken.price = rewardTokenPrice;
      rewardToken.claimableData.value =
        rewardTokenPrice * Number(rewardToken.claimableData.balance);
      // stakingToken.value = Number(stakingToken.price) * Number(stakingToken.balance);
      const poolShare = Number(stakingToken.balance) / Number(stakingToken.totalSupply);
      // staking token
      const stakingTokenPrice = tokensPrices.prices[stakingToken.address];
      stakingToken.price = Number(stakingTokenPrice) || null;
      stakingToken.value = Number(stakingTokenPrice) * Number(stakingToken.balance) || null;
      stakingToken.tokens?.forEach((token) => {
        const price = tokensPrices.prices[token.address];
        token.price = Number(price) || null;
        token.value = Number(price) * Number(token.balance) || null;
        const tokenBalance = poolShare * Number(token.reserve);
        token.balance = tokenBalance.toString();
        token.value = tokenBalance * token.price;
      });
    });
  }

  public async getProtocolFeaturesV2(
    protocolName: ProtocolName,
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const protocol: BasicProtocol = this.getProtocolByName(protocolName);
    // eslint-disable-next-line prefer-const
    let [data, errors] = await protocol.getAllFeaturesBaseData(addresses, chain);

    // add prices here if needed
    [data, errors] = await this.adjustPrices(data, errors);

    return [data, errors];
  }

  async adjustPrices(data: BaseData[], errors: string[]): Promise<[BaseData[], string[]]> {
    const chainAssets: Map<number, Set<string>> = new Map<number, Set<string>>();
    // get all assets for prices
    data.forEach((baseData) => {
      try {
        const setChainAsset = (instance) =>
          chainAssets.get(baseData.chain.id).add(instance.address);
        const setChainAssetsArray = (instance) => instance.forEach((token) => setChainAsset(token));

        if (!chainAssets.get(baseData.chain.id)) {
          chainAssets.set(baseData.chain.id, new Set<string>());
        }

        if (baseData instanceof BaseDataLp) {
          baseData.items.forEach((poolFeature) => {
            setChainAssetsArray(poolFeature.tokens);
          });
        }

        if (baseData instanceof BaseDataStaking) {
          baseData.items.forEach((stakingPosition) => {
            if (stakingPosition.stakingToken.tokens?.length) {
              stakingPosition.stakingToken.tokens.forEach((poolToken) => {
                if ((poolToken as UnderlyingStakingLp).tokens?.length) {
                  setChainAssetsArray((poolToken as UnderlyingStakingLp).tokens);
                } else {
                  setChainAsset(poolToken);
                }
              });
            } else {
              setChainAsset(stakingPosition.stakingToken);
            }

            if (stakingPosition.rewards?.length) {
              setChainAssetsArray(stakingPosition.rewards);
            }
          });
        }

        if (baseData instanceof BaseDataLending) {
          baseData.items.forEach((i) => {
            setChainAsset(i.token);
          });
        }

        if (baseData instanceof BaseLeverageFarming) {
          baseData.items.forEach((leverageFarming) => {
            if (leverageFarming.farmToken.tokens.length) {
              setChainAssetsArray(leverageFarming.farmToken.tokens);
            } else {
              setChainAsset(leverageFarming.farmToken);
            }
            setChainAsset(leverageFarming.borrowToken);
          });
        }
      } catch (e) {
        this.logger.error(e);
        errors.push(`Failed collecting assets for chain ${baseData?.chain?.id}`);
      }
    });

    const chainAssetPrices = new Map<number, Map<string, number>>();
    try {
      const promises = [];
      // TODO: This currently only accounts for tokens that are priced
      // via uniswap-like pairs. For others we can set the prices in
      // the protocol and it will use that as the fallback here
      chainAssets.forEach((assets, chainId) => {
        promises.push(this.priceService.getTokenPricesFetch(Array.from(assets), chainId));
      });

      // todo: need to update prices api to get prices from many chains
      const chainPrices = await Promise.allSettled(promises);
      chainPrices.forEach((cpr) => {
        if (cpr.status === 'fulfilled') {
          const pricesData = cpr.value as PriceResponseDto<CurrentPricesPayload>;
          chainAssetPrices.set(pricesData.chain.id, new Map<string, number>());
          Object.keys(pricesData.prices).forEach((address) => {
            const price = pricesData.prices[address] ? Number(pricesData.prices[address]) : null;
            chainAssetPrices.get(pricesData.chain.id).set(address, price);
          });
        } else {
          this.logger.error(cpr.reason);
        }
      });
      // eslint-disable-next-line no-empty
    } catch (e) {
      this.logger.error(e);
      errors.push(`Failed getting token prices in protocol.service`);
    }

    data.forEach((baseData) => {
      try {
        if (baseData instanceof BaseDataLp) {
          baseData.total = 0;
          baseData.items.forEach((poolFeature) => {
            poolFeature.tokens.forEach((poolToken) => {
              this.setTokenPriceAndValue(baseData.chain.id, poolToken, chainAssetPrices);
              baseData.total += poolToken.value;
            });
          });
        }

        if (baseData instanceof BaseDataStaking) {
          baseData.total = 0;
          baseData.items.forEach((stakingPosition) => {
            stakingPosition.rewards?.forEach((reward) => {
              reward.price =
                chainAssetPrices.get(baseData.chain.id).get(reward.address) ?? reward.price;
              reward.claimableData.value = Number(reward.claimableData.balance) * reward.price;
              baseData.total += reward.claimableData.value;
            });

            if (stakingPosition.stakingToken.tokens?.length) {
              stakingPosition.stakingToken.tokens.forEach((poolToken) => {
                if ((poolToken as UnderlyingStakingLp).tokens?.length) {
                  this.underlyingStakingTokensHandling(
                    poolToken as UnderlyingStakingLp,
                    chainAssetPrices,
                    baseData,
                  );
                } else {
                  this.setTokenPriceAndValue(baseData.chain.id, poolToken, chainAssetPrices);
                  baseData.total += poolToken.value;
                }
              });
            } else {
              if (
                alpacaDebtTokens.some((address) => address === stakingPosition.stakingToken.address)
              ) {
                stakingPosition.stakingToken.value = stakingPosition.rewards[0].claimableData.value;
              } else {
                this.setTokenPriceAndValue(
                  baseData.chain.id,
                  stakingPosition.stakingToken,
                  chainAssetPrices,
                );
                baseData.total += stakingPosition.stakingToken.value;
              }
            }
          });
        }

        if (baseData instanceof BaseDataLending) {
          baseData.total = 0;
          baseData.items.forEach((lendingPosition) => {
            lendingPosition.token.price =
              chainAssetPrices.get(baseData.chain.id).get(lendingPosition.token.address) ??
              lendingPosition.token.price;
            lendingPosition.value = lendingPosition.balance * lendingPosition.token.price;
            baseData.total += lendingPosition.value;
          });
        }

        if (baseData instanceof BaseLeverageFarming) {
          baseData.total = 0;
          baseData.items.forEach((leverageFarming) => {
            let leverageTotal = 0;
            if (leverageFarming.farmToken.tokens.length) {
              leverageFarming.farmToken.tokens.forEach((poolToken) => {
                this.setTokenPriceAndValue(baseData.chain.id, poolToken, chainAssetPrices);
                leverageTotal += poolToken.value;
              });
            } else {
              this.setTokenPriceAndValue(
                baseData.chain.id,
                leverageFarming.farmToken,
                chainAssetPrices,
              );
              leverageTotal += leverageFarming.farmToken.value;
            }
            this.setTokenPriceAndValue(
              baseData.chain.id,
              leverageFarming.borrowToken,
              chainAssetPrices,
            );
            leverageFarming.earned = leverageTotal - leverageFarming.borrowToken.value;
            baseData.total += leverageFarming.earned;
            leverageFarming.debtRatio = (leverageFarming.borrowToken.value / leverageTotal) * 100;
          });
        }
      } catch (e) {
        errors.push('Failed calculating price');
        this.logger.error(e);
      }
    });
    return [data, errors];
  }

  private underlyingStakingTokensHandling(
    poolToken: UnderlyingStakingLp,
    chainAssetPrices: Map<number, Map<string, number>>,
    baseData: BaseData,
  ) {
    let lpValue = 0;
    poolToken.tokens.forEach((underlying) => {
      this.setTokenPriceAndValue(baseData.chain.id, underlying, chainAssetPrices);
      lpValue += underlying.value;
    });
    poolToken.value = lpValue;
    baseData.total += lpValue;
    delete (poolToken as UnderlyingStakingLp).tokens;
  }

  private setTokenPriceAndValue(
    chainId: number,
    token: any,
    chainAssetPrices: Map<number, Map<string, number>>,
  ) {
    token.price = chainAssetPrices.get(chainId).get(token.address) ?? token.price;
    token.value = Number(token.balance) * (token.price ?? 0);
  }
}
