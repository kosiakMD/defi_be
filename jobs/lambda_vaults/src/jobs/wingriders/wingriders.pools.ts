import BigNumber from 'bignumber.js';
import { map, firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CurrencyIdEnum, ProtocolNameEnum } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { NotifySupportedFeature } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { concatStrings } from '@app/common/utils';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { CardanoService } from '../../microservices/cardano.service';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import {
  ADA_TOKEN_DECIMALS,
  ADA_TOKEN_TICKER,
  LOVELACE_TOKEN_TICKER,
  WING_RIDERS_ADA_ASSET_NAME,
  WING_RIDERS_CONTRACT_POLICY_ID,
  WING_RIDERS_DEFAULT_TOTAL_SUPPLY,
  WING_RIDERS_MAX_TOTAL_SUPPLY,
} from '../../utils/constants';
import { toDecimals } from '../../utils/number';
import { isTimeToDo } from '../../utils/time';
import { Pool, Asset, ITokenAmount } from '../cardano/cardano.interfaces';
import { CardanoPools } from '../cardano/cardano.pools';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import {
  IToken,
  IWingRidersPool,
  IWingRidersPoolMetadataResponse,
  IWingRidersPoolMetadata,
  Subject,
  TokensMetadataMap,
} from './wingriders.interfaces';

export class WingRidersPools extends CardanoPools implements JobInterface {
  protocol = ProtocolNameEnum.wingriders;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  api: {
    endpoint: {
      poolsWithMarketData: string;
      tokensMetadata: string;
    };
  };

  mapping = [];

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly storeService: StoreService,
    protected readonly accountService: AccountService,
    private readonly priceService: PriceService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly cardanoService: CardanoService,
  ) {
    super(logger, storeService, accountService);

    this.api = {
      endpoint: {
        poolsWithMarketData:
          this.configService.get<string>('WINGRIDERS_AGGREGATOR_URL') + '/poolsWithMarketdata',
        tokensMetadata:
          this.configService.get<string>('WINGRIDERS_EXPLORER_URL') + '/api/tokens/metadata',
      },
    };
  }

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;

    if (
      !jobMapping.mapping ||
      isTimeToDo(jobMapping.updatedAt ?? jobMapping.createdAt, jobMapping.updateFrequency)
    ) {
      this.logger.log('it is time to update mapping', this.placeholder);
      jobMapping = await this.buildInitialMapping(jobMapping);
    }

    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
  }

  async updateWithChainData(): Promise<NotifySupportedFeature[]> {
    const pricedTokenAddresses = this.mapping
      .flatMap((m) => m.tokens.map((t) => t.address))
      .join(',');

    const { prices } = await this.priceService.getCurrentPrices(
      pricedTokenAddresses,
      CurrencyIdEnum.usd,
      this.chain,
      this.protocol,
    );

    const pools = await this.getPools().then((pools) => this.poolsToMap(pools));

    for (const lp of this.mapping) {
      if (lp instanceof LiquidityPoolFeature && pools.has(lp.address)) {
        const pool = pools.get(lp.address);

        lp.tokens[0].reserve = toDecimals(pool.quantityA, pool.assetA.decimals);
        lp.tokens[0].price = Number(prices[CARDANO_COIN_ADDRESS]);

        lp.tokens[1].reserve = toDecimals(pool.quantityB, pool.assetB.decimals);
        lp.tokens[1].price = Number(prices[pool.assetB.assetId]);

        lp.stats.tvl =
          new BigNumber(pool.tvl).toNumber() ||
          lp.tokens.reduce((tvl, token) => {
            return tvl + token.price * token.reserve;
          }, 0);

        const assetsAddresses = await this.cardanoService.obtainAssetsAddresses(lp.lpToken.address);

        const lpTotalSupply =
          assetsAddresses.reduce((prevTotalSupply, assetAddress): number => {
            return (
              prevTotalSupply +
              +(+assetAddress.quantity > +WING_RIDERS_MAX_TOTAL_SUPPLY ? 0 : assetAddress.quantity)
            );
          }, 0) || +WING_RIDERS_DEFAULT_TOTAL_SUPPLY;

        lp.lpToken.totalSupply = lpTotalSupply;
        lp.stats.feeRate = Number(pool.fee);
      }
    }
    return this.mapping;
  }

  async getPools(): Promise<Pool[]> {
    const request = this.httpService
      .post<IWingRidersPool[]>(this.api.endpoint.poolsWithMarketData, {
        limit: 500,
      })
      .pipe(map((r) => r.data));
    const wingRidersPools = await firstValueFrom(request);
    const tokensMetadataMap: TokensMetadataMap = new Map();

    await this.getAndMapPoolsMetadata(wingRidersPools, tokensMetadataMap);

    return this.wingRidersPoolToCardanoPool(wingRidersPools, tokensMetadataMap);
  }

  async getPoolsMetadata(subjects: Subject[]): Promise<IWingRidersPoolMetadata[]> {
    const request = this.httpService
      .post<IWingRidersPoolMetadataResponse>(this.api.endpoint.tokensMetadata, { subjects })
      .pipe(map((r) => r.data));

    return (await firstValueFrom(request)).Right;
  }

  async buildInitialMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);

    const liquidityPools: LiquidityPoolFeature[] = [];
    const pools = await this.getPools();
    const assets = await Promise.all(pools.map((pool) => this.saveAssets(pool)));

    for (const [assetA, assetB, assetLP] of assets) {
      const lpFeature = this.buildLiquidityPoolFeature(assetA, assetB, assetLP);
      liquidityPools.push(lpFeature);
    }

    const mappings = await Promise.allSettled(liquidityPools.map((lp) => this.toDbMapping(lp)));
    const [settledMappings] = handlePromiseAllSettled(mappings);

    jobMapping.mapping = settledMappings;
    jobMapping.updatedAt = new Date();
    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);

    return jobMapping;
  }

  private async getAndMapPoolsMetadata(
    pools: IWingRidersPool[],
    tokensMetadataMap: TokensMetadataMap,
  ): Promise<void> {
    const subjects = pools.reduce((prevSubjects, pool) => {
      return prevSubjects.concat(pool.tokenBundle.map((token) => token.policyId + token.assetName));
    }, []);

    (await this.getPoolsMetadata(subjects)).forEach((poolMetadata) => {
      tokensMetadataMap.set(poolMetadata.subject, poolMetadata);
    });
  }

  private isAdaToken(token: IToken): boolean {
    return token.assetName === WING_RIDERS_ADA_ASSET_NAME;
  }

  private isLovelaceToken(token: ITokenAmount): boolean {
    return token.unit === LOVELACE_TOKEN_TICKER;
  }

  private isLpToken(token: IToken): boolean {
    return token.policyId === WING_RIDERS_CONTRACT_POLICY_ID && !this.isAdaToken(token);
  }

  private async wingRidersPoolToCardanoPool(
    wingRidersPools: IWingRidersPool[],
    tokensMetadataMap: TokensMetadataMap,
  ): Promise<Pool[]> {
    const pools: Pool[] = [];

    for await (const wingRidersPool of wingRidersPools.filter(
      (wingRidersPool) => wingRidersPool.tokenBundle.length === 3,
    )) {
      let assetA: Asset;
      let assetLP: Asset;

      let quantityA: string;
      let quantityLP: string;

      const assetBToken = wingRidersPool.tokenBundle.find(
        (token) => !this.isAdaToken(token) && !this.isLpToken(token),
      );
      const assetBTokenMetadata = tokensMetadataMap.get(
        assetBToken.policyId + assetBToken.assetName,
      );

      const assetB: Asset = {
        assetId: assetBToken.policyId + assetBToken.assetName,
        assetName: assetBTokenMetadata?.name?.value,
        decimals: assetBTokenMetadata?.decimals?.value ?? 6,
        ticker: assetBTokenMetadata?.ticker?.value,
      };
      const quantityB = assetBToken.quantity;

      await Promise.all(
        wingRidersPool.tokenBundle.map(async (token) => {
          if (this.isAdaToken(token)) {
            assetA = {
              assetId: CARDANO_COIN_ADDRESS,
              assetName: ADA_TOKEN_TICKER,
              ticker: ADA_TOKEN_TICKER,
              decimals: ADA_TOKEN_DECIMALS,
            };
            quantityA = (
              await this.cardanoService.obtainAddressesUtxos(wingRidersPool.address)
            )[0].amount.find(this.isLovelaceToken).quantity;
          }

          if (this.isLpToken(token)) {
            assetLP = {
              assetId: token.policyId + token.assetName,
              assetName: `${ADA_TOKEN_TICKER}/${assetB.ticker}`,
              ticker: `${ADA_TOKEN_TICKER}/${assetB.ticker}`,
              decimals: assetB.decimals,
            };
            quantityLP = token.quantity;
          }
        }),
      );

      pools.push({
        assetA,
        assetB,
        assetLP,
        quantityA,
        quantityB,
        quantityLP,
        name: `${assetA?.ticker}/${assetB?.ticker}`,
      });
    }

    return pools;
  }
}
