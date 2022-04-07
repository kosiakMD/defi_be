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
import { BaseDataClaimable } from '@app/common/dto/base.data.claimable.dto';
import { BaseDataLending } from '@app/common/dto/base.data.lending.dto';
import { BaseDataLocked } from '@app/common/dto/base.data.locked.dto';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import { BaseDataMint } from '@app/common/dto/base.data.mint';
import { BaseDataShortFarm } from '@app/common/dto/base.data.short.farm';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { BaseLeverageFarming } from '@app/common/dto/base.leverage.farming.dto';
import { BaseDataAirdrop } from '@app/common/dto/baseDataAirdrop';
import { ChainIdEnum } from '@app/common/enum';
import { UnderlyingStakingLp } from '@app/common/jobs/staking';

import {
  CurrentPricesPayload,
  DetailedResponseDto,
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
  PoolTokenDto,
  PriceResponseDto,
} from '../../common/dto';
import { Asset, BaseData, PoolToken } from '../../common/interfaces/transactions.interfaces';
import { objectUpdate } from '../../common/utils/object';

import { ProtocolBasicInfo } from '../integrations/dto/features.dto';
import { AccountService } from '../microservices/account.service';
import { PriceService } from '../microservices/price.service';
import { FeatureHandleDto, RawFeaturesDto } from './dto/protocols.dto';
import { tokenDictionary } from './helpers/protocols.dictionaries';
import AaveProtocolV2 from './protocols/aaveProtocolV2';
import { AbracadabraProtocol } from './protocols/abracadabra/abracadabra.protocol';
import { alpacaDebtTokens } from './protocols/alpaca/contracts/alpaca.abi';
import AlpacaProtocol from './protocols/alpacaProtocol';
import { AnchorProtocol } from './protocols/anchor/anchor.protocol';
import { AstroportProtocol } from './protocols/astroport/astroport.protocol';
import AutofarmProtocol from './protocols/autofarmProtocol';
import BadgerProtocol from './protocols/badger/badger.protocol';
import BasicProtocol from './protocols/basicProtocol';
import { BeefyProtocol } from './protocols/beefyProtocol';
import { CompoundProtocol } from './protocols/compoundProtocol';
import { ConvexProtocol } from './protocols/convex/convex.protocol';
import CurveProtocol from './protocols/curve/curve.protocol';
import DefiKingdomsProtocol from './protocols/defikingdoms/defikingdoms.protocol';
import EllipsisProtocol from './protocols/ellipsis/ellipsis.protocol';
import IslandswapProtocol from './protocols/islandswap/islandswap.protocol';
import MarinadeProtocol from './protocols/marinade/marinade.protocol';
import MinswapProtocol from './protocols/minswap/minswap.protocol';
import { MirrorProtocol } from './protocols/mirror/mirror.protocol';
import MojitoswapProtocol from './protocols/mojitoswap/mojitoswap.protocol';
import { OlympusProtocol } from './protocols/olympus/olympus.protocol';
import OrcaProtocol from './protocols/orca/orca.protocol';
import PancakeProtocol from './protocols/pancake/pancake.protocol';
import PancakeProtocolV1 from './protocols/pancake/pancake.protocol.v1';
import { PangolinV2Protocol } from './protocols/pangolin/pangolinV2.protocol';
import QuickswapProtocol from './protocols/quickswap/quickswapProtocol';
import RaydiumProtocol from './protocols/raydium/raydium.protocol';
import SaberProtocol from './protocols/saber/saber.protocol';
import SpookySwapProtocol from './protocols/spookyswap/spookyswapProtocol';
import { StaderProtocol } from './protocols/stader/stader.protocol';
import SundaeSwapProtocol from './protocols/sundaeswap/sundaeswap.protocol';
import SushiswapProtocolV2 from './protocols/sushiswapProtocolV2';
import { TerraswapProtocol } from './protocols/terraswap/terraswap.protocol';
import TraderJoeProtocol from './protocols/traderjoe/trader-joe.protocol';
import { TrisolarisProtocol } from './protocols/trisolaris/trisolaris.protocol';
import UniswapProtocolV2 from './protocols/uniswapLike/uniswapProtocolV2';
import UniswapProtocolV3 from './protocols/uniswapProtocolV3';
import VenusProtocol from './protocols/venusProtocol';
import ViperswapProtocol from './protocols/viperswap/viperswap.protocol';
import { VVSProtocol } from './protocols/vvs/vvs.protocol';
import WePiggyProtocol from './protocols/wepiggyProtocol';
import { WonderlandProtocol } from './protocols/wonderland/wonderland.protocol';
import YearnProtocolV1 from './protocols/yearnProtocolV1';
import YearnProtocolV2 from './protocols/yearnProtocolV2';

@Injectable()
export class ProtocolService {
  private readonly protocols: BasicProtocol[] = [];

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly priceService: PriceService,
    private readonly aaveProtocolV2: AaveProtocolV2,
    private readonly alpacaProtocol: AlpacaProtocol,
    private readonly abracadabraProtocol: AbracadabraProtocol,
    private readonly autofarmProtocol: AutofarmProtocol,
    private readonly badgerProtocol: BadgerProtocol,
    private readonly beefyProtocol: BeefyProtocol,
    private readonly compoundProtocol: CompoundProtocol,
    private readonly convexProtocol: ConvexProtocol,
    private readonly curveProtocol: CurveProtocol,
    private readonly defiKingdomsProtocol: DefiKingdomsProtocol,
    private readonly ellipsisProtocol: EllipsisProtocol,
    private readonly islandswapProtocol: IslandswapProtocol,
    private readonly mojitoswapProtocol: MojitoswapProtocol,
    private readonly olympusProtocol: OlympusProtocol,
    private readonly pancakeProtocolV1: PancakeProtocolV1,
    private readonly pancakeProtocolV2: PancakeProtocol,
    private readonly pangolinProtocolV2: PangolinV2Protocol,
    private readonly quickswapProtocol: QuickswapProtocol,
    private readonly raydiumProtocol: RaydiumProtocol,
    private readonly saberProtocol: SaberProtocol,
    private readonly spookySwapProtocol: SpookySwapProtocol,
    private readonly sushiswapProtocolV2: SushiswapProtocolV2,
    private readonly traderjoeProtocol: TraderJoeProtocol,
    private readonly uniswapProtocolV2: UniswapProtocolV2,
    private readonly uniswapProtocolV3: UniswapProtocolV3,
    private readonly venusProtocol: VenusProtocol,
    private readonly viperswapProtocol: ViperswapProtocol,
    private readonly vvsProtocol: VVSProtocol,
    private readonly wePiggyProtocol: WePiggyProtocol,
    private readonly wonderlandProtocol: WonderlandProtocol,
    private readonly yearnProtocolV1: YearnProtocolV1,
    private readonly yearnProtocolV2: YearnProtocolV2,
    private readonly trisolarisProtocol: TrisolarisProtocol,
    private readonly orcaProtocol: OrcaProtocol,
    private readonly sundaeswapProtocol: SundaeSwapProtocol,
    private readonly anchorProtocol: AnchorProtocol,
    private readonly terraswapProtocol: TerraswapProtocol,
    private readonly astroportProtocol: AstroportProtocol,
    private readonly marinadeProtocol: MarinadeProtocol,
    private readonly minswapProtocol: MinswapProtocol,
    private readonly mirrorProtocol: MirrorProtocol,
    private readonly staderProtocol: StaderProtocol,
  ) {
    this.protocols = [
      aaveProtocolV2,
      abracadabraProtocol,
      alpacaProtocol,
      anchorProtocol,
      autofarmProtocol,
      badgerProtocol,
      beefyProtocol,
      compoundProtocol,
      convexProtocol,
      curveProtocol,
      defiKingdomsProtocol,
      ellipsisProtocol,
      islandswapProtocol,
      mojitoswapProtocol,
      olympusProtocol,
      orcaProtocol,
      pancakeProtocolV1,
      pancakeProtocolV2,
      pangolinProtocolV2,
      quickswapProtocol,
      raydiumProtocol,
      saberProtocol,
      spookySwapProtocol,
      sushiswapProtocolV2,
      terraswapProtocol,
      traderjoeProtocol,
      trisolarisProtocol,
      uniswapProtocolV2,
      uniswapProtocolV3,
      venusProtocol,
      viperswapProtocol,
      vvsProtocol,
      wePiggyProtocol,
      wonderlandProtocol,
      yearnProtocolV1,
      yearnProtocolV2,
      sundaeswapProtocol,
      astroportProtocol,
      marinadeProtocol,
      minswapProtocol,
      mirrorProtocol,
      staderProtocol,
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
        const setChainAsset = (instance: { address: Address }) =>
          chainAssets.get(baseData.chain.id).add(instance.address);
        const setChainAssetsArray = (instance: { address: Address }[]) =>
          instance.forEach((token) => setChainAsset(token));

        if (!chainAssets.get(baseData.chain.id)) {
          chainAssets.set(baseData.chain.id, new Set<string>());
        }

        if (baseData instanceof BaseDataLp) {
          baseData.items.forEach((poolFeature) => {
            setChainAssetsArray(poolFeature.tokens);

            if (poolFeature.rewards?.length) {
              setChainAssetsArray(poolFeature.rewards);
            }
          });
        } else if (baseData instanceof BaseDataClaimable) {
          baseData.items.forEach((claimable) => {
            setChainAsset(claimable);
          });
        } else if (baseData instanceof BaseDataStaking) {
          baseData.items.forEach((stakingPosition) => {
            if (stakingPosition.stakingToken.tokens?.length) {
              stakingPosition.stakingToken.tokens.forEach((poolToken) => {
                if (poolToken.tokens?.length) {
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
        } else if (baseData instanceof BaseDataLending) {
          baseData.items.forEach((i) => {
            setChainAsset(i.token);
          });
        } else if (baseData instanceof BaseLeverageFarming) {
          baseData.items.forEach((leverageFarming) => {
            if (leverageFarming.farmToken.tokens.length) {
              setChainAssetsArray(leverageFarming.farmToken.tokens);
            } else {
              setChainAsset(leverageFarming.farmToken);
            }
            setChainAsset(leverageFarming.borrowToken);
          });
        } else if (baseData instanceof BaseDataLocked) {
          baseData.items.forEach((token) => {
            if (token.tokens?.length) {
              setChainAssetsArray(token.tokens);
              setChainAsset(token.rewards);
            } else {
              setChainAsset(token);
            }
          });
        } else if (baseData instanceof BaseDataMint) {
          baseData.items.forEach((item) => {
            setChainAsset(item.mintedToken);
            setChainAsset(item.collateral);
          });
        } else if (baseData instanceof BaseDataShortFarm) {
          baseData.items.forEach((item) => {
            setChainAsset(item.locked);
            setChainAsset(item.stakingToken);
            setChainAsset(item.rewards[0]);
          });
        } else if (baseData instanceof BaseDataAirdrop) {
          baseData.items.forEach((item) => setChainAsset(item.token));
        }
      } catch (e) {
        this.logger.error(e);
        errors.push(`Failed collecting assets for chain ${baseData?.chain?.id}`);
      }
    });
    const chainAssetPrices = new Map<number, Map<string, number>>();
    try {
      const promises = [];
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

            poolFeature.rewards?.forEach((reward) => {
              reward.price =
                chainAssetPrices.get(baseData.chain.id).get(reward.address) ?? reward.price;
              reward.claimableData.value = Number(reward.claimableData.balance) * reward.price;
              baseData.total += reward.claimableData.value;
            });
          });
        } else if (baseData instanceof BaseDataClaimable) {
          baseData.total = 0;
          baseData.items.forEach((token) => {
            token.price = chainAssetPrices.get(baseData.chain.id).get(token.address) ?? token.price;
            token.claimableData.value = token.price * Number(token.claimableData.balance);
            baseData.total += token.claimableData.value;
          });
        } else if (baseData instanceof BaseDataStaking) {
          baseData.total = 0;
          baseData.locked = 0;
          baseData.items.forEach((stakingPosition) => {
            stakingPosition.rewards?.forEach((reward) => {
              reward.price =
                chainAssetPrices.get(baseData.chain.id).get(reward.address) ?? reward.price;
              reward.claimableData.value = Number(reward.claimableData.balance) * reward.price;
              if (reward.claimableData.lockedBalance) {
                reward.claimableData.lockedValue =
                  Number(reward.claimableData.lockedBalance) * reward.price;
                baseData.locked += reward.claimableData.lockedValue;
              }
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
                  if (Number.isNaN(poolToken.value)) {
                    this.logger.warn(
                      `Failed to get price for token ${poolToken.address} - ${baseData.chain.id}`,
                    );
                  }
                  baseData.total += poolToken.value || 0;
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
        } else if (baseData instanceof BaseDataLending) {
          baseData.total = 0;
          baseData.items.forEach((lendingPosition) => {
            lendingPosition.token.price =
              chainAssetPrices.get(baseData.chain.id).get(lendingPosition.token.address) ??
              lendingPosition.token.price;
            lendingPosition.value = lendingPosition.balance * lendingPosition.token.price;
            baseData.total += lendingPosition.value;
          });
        } else if (baseData instanceof BaseLeverageFarming) {
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
        } else if (baseData instanceof BaseDataLocked) {
          baseData.total = 0;
          baseData.items.forEach((item) => {
            if (item.tokens.length) {
              this.setTokenPriceAndValue(baseData.chain.id, item.rewards, chainAssetPrices);
              if (item.locked) {
                item.locked.value += item.rewards.value;
              }
              item.tokens.forEach((underlying) => {
                this.setTokenPriceAndValue(baseData.chain.id, underlying, chainAssetPrices);
                item.locked
                  ? (item.locked.value += underlying.value)
                  : (item.unlocked.value += underlying.value);
              });
              baseData.total += item.locked ? item.locked.value : item.unlocked.value;
            } else {
              item.price = chainAssetPrices.get(baseData.chain.id).get(item.address) ?? item.price;
              item.locked.value = item.price * Number(item.locked.balance);
              item.unlocked.value = item.price * Number(item.unlocked.balance);
              item.totalValue = item.locked.value + item.unlocked.value;
              baseData.total += item.totalValue;
            }
          });
        } else if (baseData instanceof BaseDataMint) {
          baseData.total = 0;
          baseData.items.forEach((item) => {
            const { mintedToken, collateral } = item;
            this.setTokenPriceAndValue(baseData.chain.id, mintedToken, chainAssetPrices);
            this.setTokenPriceAndValue(baseData.chain.id, collateral, chainAssetPrices);
            baseData.total += collateral.value - mintedToken.value;
          });
        } else if (baseData instanceof BaseDataShortFarm) {
          baseData.total = 0;
          baseData.items.forEach((item) => {
            const { stakingToken, rewards, locked } = item;
            this.setTokenPriceAndValue(baseData.chain.id, stakingToken, chainAssetPrices);
            this.setTokenPriceAndValue(baseData.chain.id, locked, chainAssetPrices);
            rewards[0].price =
              chainAssetPrices.get(baseData.chain.id).get(rewards[0].address) ?? rewards[0].price;
            rewards[0].claimableData.value =
              Number(rewards[0].claimableData.balance) * rewards[0].price;
            baseData.total += (rewards[0].claimableData.value || 0) + locked.value;
          });
        } else if (baseData instanceof BaseDataAirdrop) {
          baseData.total = 0;
          baseData.items.forEach((item) => {
            this.setTokenPriceAndValue(baseData.chain.id, item.token, chainAssetPrices);
            baseData.total += item.token.value;
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
    let derivedLpValue = 0;
    poolToken.tokens.forEach((underlying) => {
      this.setTokenPriceAndValue(baseData.chain.id, underlying, chainAssetPrices);
      derivedLpValue += underlying.value;
    });
    poolToken.value = poolToken.price ? poolToken.balance * poolToken.price : derivedLpValue;
    baseData.total += poolToken.value;
    delete poolToken.tokens; // delete underlying balances
    poolToken.tokens = [];
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
