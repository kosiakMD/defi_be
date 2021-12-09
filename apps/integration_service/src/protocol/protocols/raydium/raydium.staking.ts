import { Connection } from '@solana/web3.js';
import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainDto,
  FeatureEnum,
  Logger,
  ProtocolTypeEnum,
  RaydiumProtocolEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';

import { Web3Provider } from '../../../chain/web3.provider';
import { decimalsDivider } from '../../../utils/util';
import { getListInfo } from './utils/staking/staking-pools';

@Injectable()
export class RaydiumStaking {
  private web3: Connection;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly web3Provider: Web3Provider,
  ) {
    this.web3 = web3Provider.instanceSol();
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    const cacheKey = `${chain.id}_${RaydiumProtocolEnum.raydium}_${FeatureEnum.staking}`;
    const cachedPools: NotifyStaking = await this.cache.get(cacheKey);
    if (!cachedPools) {
      throw new Error(`not found cached data for key '${cacheKey}'`);
    }
    const cachedPoolsMap = new Map<string, IntegrationStakingPositionDto>(
      cachedPools.items.map((cpi) => [cpi.address.toString(), cpi]),
    );
    console.log(cachedPoolsMap);

    const programId = 'EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q';

    const baseDataStakingMap: Map<string, BaseDataStaking> = new Map<string, BaseDataStaking>(
      addresses.map((a) => [
        a,
        plainToClass(BaseDataStaking, {
          chain: chain,
          userAddress: a,
          protocolType: ProtocolTypeEnum.staking,
          projectName: RaydiumProtocolEnum.raydium,
          feature: FeatureEnum.staking,
          items: [],
        }),
      ]),
    );

    const balances = await getListInfo(this.web3, addresses, programId);
    for (const b of balances) {
      const vault = cachedPoolsMap.get(b.poolId);
      // tooo: add logging
      if (!vault) {
        continue;
      }
      const stakingPosition: IntegrationStakingPositionDto = vault;
      const balance = new BN(b.depositBalance).div(decimalsDivider(vault.stakingToken.decimals));
      const userShare = balance.toNumber() / vault.stakingToken.totalSupply;
      stakingPosition.staked = balance.toNumber();
      stakingPosition.stakingToken.tokens.forEach((t) => {
        t.balance = userShare * t.reserve;
        t.value = t.price * t.balance;
      });
      baseDataStakingMap
        .get('3eX8d6SKEqQRPcjpNc3xrbrWKjGzvVkmXbP1JS6ioFEk')
        .items.push(stakingPosition);
    }

    return Array.from(baseDataStakingMap.values());
  }
}
