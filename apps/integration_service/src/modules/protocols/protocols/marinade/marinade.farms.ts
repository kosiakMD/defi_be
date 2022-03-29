import { PublicKey, Connection } from '@solana/web3.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';

import { MarinadeProtocolEnum, ChainDto, FeatureEnum, ProtocolTypeEnum } from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyStaking } from '@app/common/jobs/notify.dto';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { Web3Provider } from '../../../chains/web3.provider';
import { AccountService } from '../../../microservices/account.service';
import { fetchYieldsQuarry } from './marinade.fetchYieldsQuarry';
import { fetchYieldsQuarryMerge } from './marinade.fetchYieldsQuarryMerge';

@Injectable()
export class MarinadeFarms {
  private connection: Connection;
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly accountService: AccountService,
    private readonly web3Provider: Web3Provider,
  ) {
    this.connection = this.web3Provider.instanceSol();
  }

  async getData(
    addresses: string[],
    chain: ChainDto,
    name: MarinadeProtocolEnum,
  ): Promise<BaseData[]> {
    const cacheKey = `${chain.id}_${name}_${FeatureEnum.farming}`;
    const cachedFarming: NotifyStaking = await this.cache.get(cacheKey);
    if (!cachedFarming) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }
    const baseDataStakingMap: Map<string, BaseDataStaking> = new Map<string, BaseDataStaking>(
      addresses.map((address) => [
        address,
        plainToClass(BaseDataStaking, {
          chain: chain,
          userAddress: address,
          protocolType: ProtocolTypeEnum.staking,
          projectName: MarinadeProtocolEnum.marinade,
          feature: FeatureEnum.staking,
          items: [],
        }),
      ]),
    );
    const cachedFarmingMap = new Map(
      cachedFarming.items.map((farming) => [farming.address, farming]),
    );

    for await (const address of addresses) {
      const publicKey = new PublicKey(address);

      const result = await Promise.all([
        fetchYieldsQuarry(this.connection, publicKey, cachedFarmingMap),
        fetchYieldsQuarryMerge(this.connection, publicKey, cachedFarmingMap),
      ]);

      const flattenResult = result.flat();

      baseDataStakingMap.get(address).items.push(...flattenResult);
    }

    return Array.from(baseDataStakingMap.values());
  }
}
