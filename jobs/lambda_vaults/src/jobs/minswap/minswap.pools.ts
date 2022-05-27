import BigNumber from 'bignumber.js';
import { map, firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { NotifySupportedFeature } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { concatStrings } from '@app/common/utils';
import { retry } from '@app/common/utils/retry';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { toDecimals } from '../../utils/number';
import { isTimeToDo } from '../../utils/time';
import { Pool } from '../cardano/cardano.interfaces';
import { CardanoPools } from '../cardano/cardano.pools';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { MinswapPool, MinswapResponse } from './minswap.interfaces';
import { AVAILABLE_POOLS_QUERY } from './minswap.queries';

export class MinswapPools extends CardanoPools implements JobInterface {
  chain = ChainIdEnum.cardano;
  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.minswap;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;
  subgraphUrl: string;

  mapping = [];
  availableDtosForConversion: Map<string, string>;
  private readonly RETRY_CALL_IN_MS = 5000;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly storeService: StoreService,
    protected readonly accountService: AccountService,
    private readonly priceService: PriceService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    super(logger, storeService, accountService);
    this.subgraphUrl = this.configService.get<string>('MINSWAP_URL');
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

  async buildInitialMapping(jobMapping: TrackedVault): Promise<any> {
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

  async updateWithChainData(): Promise<NotifySupportedFeature[]> {
    const pricedTokenAddresses = this.mapping
      .flatMap((m) => m.tokens.map((t) => this.removeDotInAssetID(t.address)))
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
        if (!pool.assetA.assetId) {
          lp.tokens[0].price = Number(prices[CARDANO_COIN_ADDRESS]);
        } else {
          lp.tokens[0].price = Number(prices[this.removeDotInAssetID(pool.assetA.assetId)]);
        }

        lp.tokens[1].reserve = toDecimals(pool.quantityB, pool.assetB.decimals);
        lp.tokens[1].price = Number(prices[this.removeDotInAssetID(pool.assetB.assetId)]);

        lp.stats.tvl =
          new BigNumber(pool.tvl).toNumber() ||
          lp.tokens.reduce((tvl, token) => {
            return tvl + token.price * token.reserve;
          }, 0);

        lp.lpToken.totalSupply = toDecimals(pool.quantityLP, lp.lpToken.decimals);
        lp.stats.feeRate = Number(pool.fee);
      }
    }
    return this.mapping;
  }

  async getPools(): Promise<Pool[]> {
    const poolLength = 320;
    const limit = 20;
    const requests = [];
    for (let offset = 0; offset < poolLength; offset += limit) {
      requests.push(
        retry(
          () =>
            firstValueFrom(
              this.httpService
                .post<MinswapResponse>(
                  this.subgraphUrl,
                  {
                    query: AVAILABLE_POOLS_QUERY,
                    variables: { limit, offset },
                  },
                  {
                    headers: { origin: 'https://defiyield.app' },
                  },
                )
                .pipe(map((r) => r.data?.data?.topPools)),
            ),
          this.RETRY_CALL_IN_MS,
        ),
      );
    }

    const response = await Promise.allSettled(requests);
    const [data, errors] = handlePromiseAllSettled(response);

    if (errors.length > 0) {
      this.logger.error(`Couldn't process some of minswap pools: ${errors.length}`);
    }

    const pools = data.flat() as unknown as MinswapPool[];
    return this.minswapPoolToCardanoPool(pools);
  }

  private minswapPoolToCardanoPool(data: MinswapPool[]): Pool[] {
    const pool: Pool[] = [];

    for (const minPool of data) {
      if (
        !minPool.assetB.metadata ||
        (minPool.assetA.currencySymbol && !minPool.assetA.metadata?.name)
      )
        continue;

      const assetA = {
        assetId: minPool.assetA.currencySymbol + minPool.assetA.tokenName || '',
        assetName: minPool.assetA.metadata?.name || 'ADA',
        decimals: minPool.assetA.metadata?.decimals || 6,
        ticker: minPool.assetA.metadata?.ticker || 'ADA',
      };

      const assetB = {
        assetId: minPool.assetB.currencySymbol + minPool.assetB.tokenName,
        assetName: minPool.assetB.metadata.name,
        decimals: minPool.assetB.metadata.decimals,
        ticker: minPool.assetB.metadata.ticker,
      };

      const assetLP = {
        assetId: minPool.lpAsset.currencySymbol + minPool.lpAsset.tokenName,
        assetName: assetA.assetName + '/' + assetB.assetName,
        decimals: minPool.assetB.metadata.decimals,
        ticker: assetA.ticker + '/' + assetB.ticker,
      };

      pool.push({
        assetA,
        assetB,
        assetLP,
        apr: 0,
        fee: minPool.tradingFeeARP?.toString(),
        name: assetLP.ticker,
        quantityA: minPool.reserveA.toString(),
        quantityB: minPool.reserveB.toString(),
        quantityLP: minPool.totalLiquidity.toString(),
      });
    }

    return pool;
  }

  private removeDotInAssetID(asset: string): string {
    return asset.replace(/\./, '');
  }
}
