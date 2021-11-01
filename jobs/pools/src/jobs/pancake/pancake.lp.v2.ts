import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CallData } from '../../chain/dto/call.data';
import { MulticallService } from '../../chain/multicall.service';
import { Web3Provider } from '../../chain/web3.provider';
import { ChainIdEnum } from '../../config/enum';
import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { SettingsService } from '../../store/service/settings.service';
import { Setting } from '../../store/setting.entity';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { toLiquidityPoolFeature } from '../../utils/conventer';
import { concatStrings } from '../../utils/string';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { JobInterface } from '../job.interface';
import { Abis } from './abis';
import { PancakeAddresses } from './addresses';

@Injectable()
export class PancakeLpV2 implements JobInterface {
  chain = ChainIdEnum.bsc;
  feature = 'pools';
  protocol = 'PancakeV2';
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  private mapping = [];
  private availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly settingsService: SettingsService,
    private readonly web3Provider: Web3Provider,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly multicallService: MulticallService,
    private readonly priceService: PriceService,
  ) {}

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;
    if (!jobMapping.mapping) {
      jobMapping = await this.buildInitialMapping(jobMapping);
    }

    // jobMapping.mapping.forEach((jm) => {
    //   this.mapping.push(IntegrationDataConverter.toDTO(jm));
    // });
    return Promise.resolve(undefined);
  }

  async buildInitialMapping(jobMapping: TrackedVault): Promise<any> {
    this.logger.log('building initial mapping', this.placeholder);

    const liquidityPools = [];
    const settingId = concatStrings(this.placeholder, 'chief_pool_length');

    let dbPoolLenthSetting: Setting = await this.settingsService.findByName(settingId);
    if (!dbPoolLenthSetting) {
      dbPoolLenthSetting = plainToClass(Setting, {});
      dbPoolLenthSetting.name = settingId;
      dbPoolLenthSetting = await this.settingsService.create(dbPoolLenthSetting);
    }

    const poolIdTo = (await this.getChainPoolLength()).toNumber() - 1;

    const poolIdFrom = Number(dbPoolLenthSetting.value);
    if (poolIdFrom >= poolIdTo) {
      this.logger.log(
        `not necessary to update existed mapping, db poolLength ${poolIdFrom}, chain poolLength ${poolIdTo}`,
        this.placeholder,
      );
      return [];
    }

    // dbPoolLenthSetting = await this.settingsService.update(dbPoolLenthSetting);

    const calls = new Map<string, CallData>();
    for (let i = poolIdFrom; i <= poolIdTo; i++) {
      calls.set(this.poolInfoLabel(i), {
        address: PancakeAddresses.chief,
        abi: Abis.poolInfo,
        input: {
          data: [i],
        },
        output: {},
      });
    }

    const callsRsp = await this.multicallService.handleInBatches(calls);

    for (let i = poolIdFrom; i <= poolIdTo; i++) {
      const tokenAddress = callsRsp.get(this.poolInfoLabel(i)).output.data.lpToken;
      try {
        const trackedLiquidityPoolTokenData: LiquidityPoolTokenDto =
          await this.accountService.saveTrackingAsset(tokenAddress, this.chain);
        if (trackedLiquidityPoolTokenData.isLp) {
          this.logger.log(
            `found new lp token to track, address: [${trackedLiquidityPoolTokenData.address}], chain: [${this.chain}]`,
            this.placeholder,
          );
          liquidityPools.push(toLiquidityPoolFeature(trackedLiquidityPoolTokenData));
        }
      } catch (e) {
        this.logger.error(
          `error to get token data to account service, chain [${this.chain}], address [${tokenAddress}]`,
          this.placeholder,
        );
      }
    }
    console.log(liquidityPools);

    return [];
  }

  async getChainPoolLength(): Promise<BigNumber> {
    const call = new Map<string, CallData>([
      [
        this.poolLengthLabel(),
        {
          address: PancakeAddresses.chief,
          abi: Abis.poolLength,
          input: {
            data: [],
          },
          output: {},
        },
      ],
    ]);
    const callRsp = await this.multicallService.handleInBatches(call);
    return callRsp.get(this.poolLengthLabel()).output.data;
  }

  poolLengthLabel() {
    return concatStrings(Abis.poolLength.name, PancakeAddresses.chief);
  }

  poolInfoLabel(poolId) {
    return concatStrings(Abis.poolInfo.name, PancakeAddresses.chief, poolId);
  }

  updateTracked(): Promise<void> {
    return Promise.resolve(undefined);
  }

  updateWithChainData(): Promise<any[]> {
    return Promise.resolve([]);
  }
}
