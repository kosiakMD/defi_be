import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { MulticallService } from '../../chain/multicall.service';
import { Web3Provider } from '../../chain/web3.provider';
import { ChainIdEnum } from '../../config/enum';
import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { concatStrings } from '../../utils/string';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { JobInterface } from '../job.interface';

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
    // console.log(jobMapping);

    return [];
  }

  updateTracked(): Promise<void> {
    return Promise.resolve(undefined);
  }

  updateWithChainData(): Promise<any[]> {
    return Promise.resolve([]);
  }
}
