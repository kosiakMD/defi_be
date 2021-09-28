import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UniswapPairReserves } from '../chain/dto/token';
import { MultiCallInternal } from '../chain/multicall';
import { Web3Provider } from '../chain/web3.provider';
import { ChainIdEnum, CurrencyIdEnum } from '../config/enum';
import { Logger } from '../logger/logger.service';
import { PriceResponseDto } from '../microservices/dto/price/price.dto';
import { IntegrationService } from '../microservices/integration.service';
import { PriceService } from '../microservices/price.service';
import { BNToDecimals } from '../utils/calc';
import { getJobPlaceholder } from '../utils/string';
import { IntegrationJob } from './dto/db.dto';
import { IntegrationJobsRepository } from './integration.jobs.repository';
import {
  LiquidityPoolFeature,
  NotifyPayloadFeaturesDto,
  ProtocolsResponseData,
} from './integrations.dto';
import { JobsFactory } from './jobs.factory';
import { LiquidityPoolJobInterface } from './liquidity.pool.job.interface';
import { SpookyswapPoolJob } from './spookyswap/spookyswap.pool.job';

@Injectable()
export class LiquidityPoolJob {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly spookySwapPoolJob: SpookyswapPoolJob,
    private readonly integrationService: IntegrationService,
    private readonly configService: ConfigService,
    private readonly dbManager: IntegrationJobsRepository,
    private readonly jobsFactory: JobsFactory,
    private readonly web3Provider: Web3Provider,
    private readonly priceService: PriceService,
  ) {}

  async collectProtocolsAvailable(): Promise<void> {
    const integrationServiceConfiguration: Set<string> =
      await this.getIntegrationServiceConfiguration();
    const integratedJobs: Map<string, LiquidityPoolJobInterface> =
      this.jobsFactory.getJobsIntegrated();
    const dbJobsConfiguration: Map<string, IntegrationJob> = await this.getDbPoolsConfiguration();

    // now need to find what exactly jobs needs to be executed:
    integrationServiceConfiguration.forEach((placeholder) => {
      const existedJob: LiquidityPoolJobInterface = integratedJobs.get(placeholder);

      if (existedJob) {
        existedJob.setConfiguration(dbJobsConfiguration.get(placeholder));
        this.logger.log(
          `found job to proceed [${placeholder}], isEnabled: [${existedJob.isEnabled()}]`,
          LiquidityPoolJob.name,
        );
        // if job is not enabled simply remove it from jobs list
        if (!existedJob.isEnabled()) {
          integratedJobs.delete(placeholder);
        }
      }
    });

    // merge all data for all chains
    const extractedPoolFeatures: Map<ChainIdEnum, Map<string, LiquidityPoolFeature>> = new Map<
      ChainIdEnum,
      Map<string, LiquidityPoolFeature>
    >();
    integratedJobs.forEach((ij) => {
      let featuresInMap: Map<string, LiquidityPoolFeature> = extractedPoolFeatures.get(ij.chain);
      if (!featuresInMap) {
        featuresInMap = new Map<string, LiquidityPoolFeature>();
      }

      ij.getTrackedLiquidityPools().map((pf) => {
        featuresInMap.set(pf.address, pf);
      });
      extractedPoolFeatures.set(ij.chain, featuresInMap);
    });

    // concurrent loop through all chains
    await Promise.all(
      Array.from(extractedPoolFeatures.keys()).map(async (chain: ChainIdEnum) => {
        const [reserves, totalSupplies] = await this.extractReservesAndSupplies(
          chain,
          extractedPoolFeatures.get(chain),
        );
        const currentPrices: Map<string, number> = await this.getCurrentPrices(
          chain,
          extractedPoolFeatures.get(chain),
        );

        extractedPoolFeatures.get(chain).forEach((pf) => {
          pf.TVL = 0;
          pf.lpToken.totalSupply = BNToDecimals(
            totalSupplies.get(pf.lpToken.address),
            pf.lpToken.decimals,
          ).toString();

          pf.tokens.map((t) => {
            t.reserve =
              t.positionInPool === 0
                ? BNToDecimals(reserves.get(pf.lpToken.address).reserve0, t.decimals).toString()
                : BNToDecimals(reserves.get(pf.lpToken.address).reserve1, t.decimals).toString();

            t.price = currentPrices.get(t.address) ? currentPrices.get(t.address) : null;
            t.value = t.price ? Number(t.reserve) * t.price : null;
            pf.TVL += t.value;
          });
        });
      }),
    );

    const featuresToNotify: NotifyPayloadFeaturesDto[] = [];
    integratedJobs.forEach((ij) => {
      const featureToNotify: NotifyPayloadFeaturesDto = {
        chain: ij.chain,
        protocolName: ij.protocol,
        featureName: ij.feature,
        items: [],
      };
      const trackedPoolsByJob: LiquidityPoolFeature[] = ij.getTrackedLiquidityPools();
      trackedPoolsByJob.map((tp) => {
        featureToNotify.items.push(extractedPoolFeatures.get(ij.chain).get(tp.address));
      });
      featuresToNotify.push(featureToNotify);
    });

    await this.integrationService.notifyWithLiquidityPoolsData(featuresToNotify);
    this.logger.log(`features notified [${featuresToNotify.length}]`, LiquidityPoolJob.name);

    for (const placeholder of integratedJobs.keys()) {
      try {
        await integratedJobs.get(placeholder).updateTrackedLiquidityPools();
      } catch (e: any) {
        this.logger.error(`error during tracked liquidity pools update`, '', placeholder);
      }
    }

    this.logger.log(`done`);
  }

  async getDbPoolsConfiguration(): Promise<Map<string, IntegrationJob>> {
    const availableDbSettings: IntegrationJob[] = await this.dbManager.getAvailablePools();
    const availableDbSettingMap: Map<string, IntegrationJob> = new Map<string, IntegrationJob>();
    availableDbSettings.map((ij) => {
      availableDbSettingMap.set(getJobPlaceholder(ij.chainId, ij.feature, ij.protocol), ij);
    });
    return availableDbSettingMap;
  }

  async getIntegrationServiceConfiguration(): Promise<Set<string>> {
    const integrationProtocols: ProtocolsResponseData =
      await this.integrationService.getProtocols();
    const integrationProtocolsSet: Set<string> = new Set<string>();
    integrationProtocols.data.map((ip) => {
      ip.features.map((f) => {
        f.list.map((feature) => {
          integrationProtocolsSet.add(getJobPlaceholder(f.chain.id, feature, ip.name));
        });
      });
    });
    return integrationProtocolsSet;
  }

  async extractReservesAndSupplies(
    chain: ChainIdEnum,
    liquidityPoolsFeatures: Map<string, LiquidityPoolFeature>,
  ): Promise<[Map<string, UniswapPairReserves>, Map<string, BigNumber>]> {
    const pairAddresses: string[] = [];
    liquidityPoolsFeatures.forEach((lpf) => {
      pairAddresses.push(lpf.lpToken.address);
    });

    const multicall = new MultiCallInternal(this.web3Provider.getInstanceByChainId(chain));

    const reserves: Map<string, UniswapPairReserves> = await multicall.getPairsReserves(
      pairAddresses,
    );
    const totalSupplies: Map<string, BigNumber> = await multicall.getTotalSupplies(pairAddresses);
    return [reserves, totalSupplies];
  }

  private async getCurrentPrices(
    chain: ChainIdEnum,
    liquidityPoolFeatures: Map<string, LiquidityPoolFeature>,
  ): Promise<Map<string, number>> {
    const currentPricesMap: Map<string, number> = new Map<string, number>();
    const addressesSet: Set<string> = new Set<string>();
    liquidityPoolFeatures.forEach((lp) => {
      lp.tokens.map((t) => {
        addressesSet.add(t.address);
      });
    });
    const currentPrices: PriceResponseDto = await this.priceService.getCurrentPrices(
      Array.from(addressesSet.values()).join(','),
      CurrencyIdEnum.usd,
      chain,
    );

    Object.keys(currentPrices.prices).map((address) => {
      currentPricesMap.set(address, currentPrices.prices[address]);
    });

    return currentPricesMap;
  }
}
