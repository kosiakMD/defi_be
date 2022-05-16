/* eslint-disable max-classes-per-file */
import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { FeatureEnum, Logger } from '@app/common';
import { Web3SolanaProviderService } from '@app/common/web3provider';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { IProtocolMeta, IRootProtocol } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { SolanaCore } from '../../SolanaCore';

export interface IAtrixSolanaMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  name: string;
  context: {
    programID: string;
  };
}
export class AtrixStaking
  extends SolanaCore<
    IStakingFeatureMinimal,
    IStakingFeatureOpportunity,
    IStakingFeatureUserEntry,
    IAtrixSolanaMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected web3Service: Web3SolanaProviderService,
    protected httpService: HttpService,
    protected configService: ConfigService,
  ) {
    super();
  }

  async initialize(): Promise<void> {
    //
  }

  async getCacheableOpportunityData(): Promise<IStakingFeatureMinimal[]> {
    const configStaker = {
      commitment: 'confirmed',
      encoding: 'base64',
      filters: stakerAccountFilter(address.toString()),
    };
  }

  getUsersData(
    addresses: string[],
  ): Promise<{ data: Map<string, IStakingFeatureUserEntry[]>; errors: Error[] }> {
    throw new Error('Method not implemented.');
  }
}
