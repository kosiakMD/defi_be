import BigNumber from 'bignumber.js';
import { map, firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { NotifySupportedFeature } from '@app/common/jobs/notify.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { concatStrings } from '@app/common/utils';

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
import { SundaeSwapPoolsResponse } from './interface';
import { AVAILABLE_POOLS_QUERY } from './queries';

@Injectable()
export class SundaeswapPools extends CardanoPools implements JobInterface {
  chain = ChainIdEnum.cardano;
  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.sundaeswap;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;
  subgraphUrl: string;

  protected mapping = [];
  protected availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly storeService: StoreService,
    protected readonly accountService: AccountService,
    private readonly priceService: PriceService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    super(logger, storeService, accountService);
    this.subgraphUrl = this.configService.get<string>('SUNDAESWAP_URL');
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
    const pools = await this.getPoolInformation();
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
    );

    const pools = await this.getPoolInformation().then((pools) => this.poolsToMap(pools));

    for (const lp of this.mapping) {
      if (lp instanceof LiquidityPoolFeature && pools.has(lp.address)) {
        const pool = pools.get(lp.address);

        lp.tokens[0].reserve = toDecimals(pool.quantityA, pool.assetA.decimals);
        lp.tokens[0].price = Number(prices[CARDANO_COIN_ADDRESS]);

        lp.tokens[1].reserve = toDecimals(pool.quantityB, pool.assetB.decimals);
        lp.tokens[1].price = Number(prices[this.removeDotInAssetID(pool.assetB.assetId)]);

        lp.stats.tvl = new BigNumber(pool.tvl).toNumber();
        lp.lpToken.totalSupply = toDecimals(pool.quantityLP, lp.lpToken.decimals);
        lp.stats.feeRate = Number(pool.fee);
      }
    }
    return this.mapping;
  }

  protected async getPoolInformation(): Promise<Pool[]> {
    const request = this.httpService
      .post<SundaeSwapPoolsResponse>(this.subgraphUrl, {
        query: AVAILABLE_POOLS_QUERY,
        variables: { pageSize: 200 },
      })
      .pipe(map((r) => r.data));
    const response = await firstValueFrom(request);
    return response?.data?.poolsPopular || [];
  }

  private removeDotInAssetID(asset: string): string {
    return asset.replace(/\./, '');
  }
}
