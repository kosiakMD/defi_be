/* eslint-disable max-classes-per-file */
import { AccountInfo, Connection, GetProgramAccountsConfig, PublicKey } from '@solana/web3.js';
import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { Web3SolanaProviderService } from '@app/common/web3provider';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { IRootProtocol, IUserDataProtocolResponse } from '../../../interfaces';
import { FARM_ACCOUNT_LAYOUT, STAKER_ACCOUNT_LAYOUT } from '../../Schemas/Atrix';
import { SolanaCore } from '../../SolanaCore';


export class AtrixStaking
  extends SolanaCore<
    IStakingMinimal,
    IStakingOpportunity,
    IStakingUserEntry,
    ISolanaMeta
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

  async initialize(): Promise<void> {
    this.connection = this.web3Service.getInstanceByChainId(this.meta.chain);
  }

  async getCacheableOpportunityData(): Promise<IAtrixStakingMinimal[]> {
    const programs = await this.getProgramId();
    const farmAccounts = await this.getFarmAccounts(programs);
    return Promise.resolve([]);
  }

  async getUsersData(
    addresses: string[],
  ): Promise<IUserDataProtocolResponse<IAtrixStakingUserEntry>> {
    const { data: pools, errors } = await this.getPoolData();
    const results = new Map<string, IAtrixStakingUserEntry[]>(
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
      new PublicKey(this.meta.context.programID),
      configOrCommitment,
    );
    const decodedProgram = this.decodeProgram(encodedProgram);
    const accounts: string[] = decodedProgram.map((account) => account.farmAccount.toString());

    return Array.from(new Set(accounts));
  }

  private decodeProgram(
    encodedProgram: Array<{ pubkey: PublicKey; account: AccountInfo<Buffer> }>,
  ) {
    return encodedProgram.map((program) => {
      return {
        pubkey: program.pubkey,
        ...STAKER_ACCOUNT_LAYOUT.decode(program.account.data),
      };
    });
  }

  private async getFarmAccounts(programs: string[]) {
    const publicKeys = programs.map((account) => new PublicKey(account));
    const encodedFarmAccounts = await this.connection.getMultipleAccountsInfo(publicKeys);

    const decoded = encodedFarmAccounts.map((account) => {
      return {
        ...FARM_ACCOUNT_LAYOUT.decode(account.data),
      };
    });

    return decoded;
  }
}