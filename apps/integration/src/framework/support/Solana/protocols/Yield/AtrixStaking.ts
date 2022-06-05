/* eslint-disable max-classes-per-file */
import { AccountInfo, Connection, GetProgramAccountsConfig, PublicKey } from '@solana/web3.js';
import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { chunk } from '@app/common/utils';
import { Web3SolanaProviderService } from '@app/common/web3provider';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { FeatureEnum } from '../../../enums';
import { IProtocolMeta, IRootProtocol, IUserDataProtocolResponse } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { FARM_ACCOUNT_LAYOUT, STAKER_ACCOUNT_LAYOUT } from '../../Schemas/Atrix';
import { SolanaCore } from '../../SolanaCore';

export interface IAtrixSolanaMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  name: string;
  context: {
    program: Address;
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
  connection: Connection;
  RPC_LIMIT_PER_CALL = 100;

  async initialize(): Promise<void> {
    this.connection = this.web3Service.getInstanceByChainId(this.meta.chain);
  }

  async getCacheableOpportunityData(): Promise<IStakingFeatureMinimal[]> {
    const programs = await this.getProgramId();
    const farmAccounts = await this.getFarmAccounts(programs);
    return Promise.resolve([]);
  }

  async getUsersData(
    addresses: string[],
  ): Promise<IUserDataProtocolResponse<IStakingFeatureUserEntry>> {
    const { data: pools, errors } = await this.getPoolData();
    const results = new Map<string, IStakingFeatureUserEntry[]>(
      addresses.map((address) => [address, []]),
    );

    return { data: results, errors };
  }

  private async getProgramId(): Promise<string[]> {
    const configOrCommitment: GetProgramAccountsConfig = {
      commitment: 'confirmed',
      encoding: 'base64',
      filters: [{ dataSize: STAKER_ACCOUNT_LAYOUT.span }],
    };
    const encodedProgram = await this.connection.getProgramAccounts(
      new PublicKey(this.meta.context.program),
      configOrCommitment,
    );
    const decoded = encodedProgram.map((program) => ({
      pubkey: program.pubkey,
      ...STAKER_ACCOUNT_LAYOUT.decode(program.account.data),
    }));
    const accounts: string[] = decoded.map((account) => account.farmAccount.toString());

    return Array.from(new Set(accounts));
  }

  private async getFarmAccounts(programs: string[]) {
    const publicKeys = programs.map((account) => new PublicKey(account));
    const encodedFarmAccounts = await Promise.all(
      chunk(publicKeys, this.RPC_LIMIT_PER_CALL).map((piece) =>
        this.connection.getMultipleAccountsInfo(piece),
      ),
    );

    const decoded = encodedFarmAccounts.flat().map((account) => ({
      ...FARM_ACCOUNT_LAYOUT.decode(account.data),
    }));

    return decoded;
  }
}
