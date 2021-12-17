import { plainToClass } from 'class-transformer';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  ChainIdEnum,
  IntegrationClaimableTokenDto,
  IntegrationFeaturesDataDto,
  LendingErcToken,
  LendingPositionDto,
  Logger,
  ProjectEnum,
  ProtocolNameEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { FeatureEnum } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { HealthFactorDto } from '@app/common/dto/HealthFactor.dto';
import { BaseDataClaimable } from '@app/common/dto/base.data.claimable.dto';
import { BaseDataHealth } from '@app/common/dto/base.data.health.dto';
import { BaseDataLending } from '@app/common/dto/base.data.lending.dto';
import { normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Asset, BaseData } from '../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../microservices/account.service';
import { CompoundSubgraph } from '../../subgraphs/subgraphs/compound.subgraph';
import BasicProtocol from './basicProtocol';
import { COMPTROLLER, CTOKEN_DECIMALS, REWARD_TOKEN } from './compound/compound.constants';
import {
  ICompoundAccount,
  ICompoundAccountResponse,
  ICompoundHttpAccount,
  ICompoundToken,
} from './compound/compound.interfaces';
import { CToken } from './compound/contracts/CToken';
import { Comptroller } from './compound/contracts/Comptroller';

export declare type ClassConstructor<T> = {
  new (...args: any[]): T;
};

@Injectable()
export class CompoundProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.eth];
  readonly project = ProjectEnum.compound;
  readonly name = ProtocolNameEnum.compound;
  readonly displayName: 'Compound';
  readonly features = {
    [ChainAbbrEnum.eth]: [
      FeatureEnum.lending,
      FeatureEnum.borrowing,
      FeatureEnum.claimable,
      FeatureEnum.health,
    ],
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    private readonly subgraph: CompoundSubgraph,
    private readonly http: HttpService,
    private readonly multicall: MulticallAggregator,
  ) {
    super();
  }

  public getAllFeaturesData?(
    address: Address,
    chain?: ChainDto,
  ): Promise<IntegrationFeaturesDataDto>;

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const errors: string[] = [];
    const baseData: BaseData[] = [];

    // claimable, lending, borrowing, collateral

    const { errors: _subgraphErrors, accounts } = await this.getSubgraphData(addresses, chain);
    const { errors: _errors, baseData: userBaseData } = await this.fillBaseData(accounts, chain);

    errors.push(..._subgraphErrors, ..._errors);
    baseData.push(...userBaseData);

    return [baseData, errors];
  }

  private suppliedLabel(account: ICompoundAccount, token: ICompoundToken): string {
    return `supplied_${account.id}_${token.market.id}`;
  }
  private borrowedLabel(account: ICompoundAccount, token: ICompoundToken): string {
    return `borrowed_${account.id}_${token.market.id}`;
  }
  private claimableLabel(account): string {
    return `claimable_${account.id}`;
  }

  async fillBaseData(
    accounts: ICompoundAccount[],
    chain: ChainDto,
  ): Promise<{ errors: string[]; baseData: BaseData[] }> {
    const errors: string[] = [];
    const baseData: BaseData[] = [];

    const promises = accounts.map(async (account) => {
      if (!account.tokens.length) return;

      const [multicallDataResult, httpAccountResult, rewareTokenResult] = await Promise.all([
        this.getMulticallData(account, chain),
        this.getHttpData(account, chain),
        this.getRewardToken(chain),
      ]);

      [
        this.getLendingPositions.bind(this),
        this.getBorrowingPositions.bind(this),
        this.getClaimableRewards.bind(this),
        this.getHealthFactor.bind(this),
      ].forEach((action) => {
        const positions = action(
          account,
          chain,
          multicallDataResult,
          httpAccountResult,
          rewareTokenResult,
        );
        if (positions.items.length) baseData.push(positions);
      });
    });

    await Promise.all(promises);

    return { errors, baseData };
  }

  /**
   * External Data Retrieval
   */
  async getRewardToken(chain: ChainDto): Promise<Asset> {
    const { data } = await this.accountService.getAssets([REWARD_TOKEN[chain.id]], [chain.id]);
    return data[0];
  }

  getMulticallData(account: ICompoundAccount, chain: ChainDto): Promise<Map<string, CallData>> {
    const balanceCalls = new Map(
      account.tokens.flatMap((token) => {
        const contract = new CToken(token.market.id);
        return [
          [this.suppliedLabel(account, token), contract.balanceOf(account.id)],
          [this.borrowedLabel(account, token), contract.borrowBalanceStored(account.id)],
        ];
      }),
    );

    const comptroller = new Comptroller(COMPTROLLER[chain.id]);
    balanceCalls.set(this.claimableLabel(account), comptroller.compAccrued(account.id));
    return this.multicall.handleInBatches(balanceCalls, chain.id);
  }

  async getHttpData(account: ICompoundAccount, chain: ChainDto): Promise<ICompoundHttpAccount> {
    if (chain.id !== ChainIdEnum.eth) return null;

    const data$ = this.http.get(
      `https://api.compound.finance/api/v2/account?addresses[]=${account.id}&page_size=1`,
    );

    const { data } = await firstValueFrom(data$);

    return data.accounts.find((a) => a.address.toLowerCase() === account.id);
  }

  async getSubgraphData(addresses: Address[], chain: ChainDto): Promise<ICompoundAccountResponse> {
    const { errors, accounts } = await this.subgraph.getUserData(addresses, chain);

    return { errors: errors ?? [], accounts };
  }

  getLendingPositions(
    account: ICompoundAccount,
    chain: ChainDto,
    multicallResults: Map<string, CallData>,
  ): BaseDataLending {
    const items = account.tokens.reduce((acc, token) => {
      const balance = normalizeDecimals(
        multicallResults.get(this.suppliedLabel(account, token)).output.data.toString(),
        CTOKEN_DECIMALS,
      );

      if (balance) {
        acc.push(this.getLendingPositionDto(token, balance * Number(token.market.exchangeRate)));
      }

      return acc;
    }, []);

    return this.formatBaseData(account.id, chain, FeatureEnum.lending, BaseDataLending, items);
  }

  getBorrowingPositions(
    account: ICompoundAccount,
    chain: ChainDto,
    multicallResults: Map<string, CallData>,
  ): BaseDataLending {
    const items = account.tokens.reduce((acc, token) => {
      const balance = normalizeDecimals(
        multicallResults.get(this.borrowedLabel(account, token)).output.data.toString(),
        token.market.underlyingDecimals,
      );

      if (balance) {
        acc.push(this.getLendingPositionDto(token, balance));
      }

      return acc;
    }, []);

    return this.formatBaseData(account.id, chain, FeatureEnum.borrowing, BaseDataLending, items);
  }

  getClaimableRewards(
    account: ICompoundAccount,
    chain: ChainDto,
    multicallResults: Map<string, CallData>,
    httpAccount: ICompoundHttpAccount,
    rewardToken,
  ): BaseDataClaimable {
    const items = [];
    const claimable = normalizeDecimals(
      multicallResults.get(this.claimableLabel(account)).output.data.toString(),
      18,
    );

    if (claimable) {
      items.push(this.getClaimableRewardDto(rewardToken, claimable));
    }
    return this.formatBaseData(account.id, chain, FeatureEnum.claimable, BaseDataClaimable, items);
  }

  getHealthFactor(
    account: ICompoundAccount,
    chain: ChainDto,
    multicallResults: Map<string, CallData>,
    httpAccount: ICompoundHttpAccount,
  ): BaseDataHealth {
    const items = [];
    if (Number(httpAccount.health.value)) {
      items.push(
        plainToClass(HealthFactorDto, {
          healthFactor: Number(httpAccount.health.value),
        }),
      );
    }

    return this.formatBaseData(account.id, chain, FeatureEnum.health, BaseDataHealth, items);
  }

  getLendingPositionDto(token: ICompoundToken, balance: number): LendingPositionDto {
    return plainToClass(LendingPositionDto, {
      address: token.market.underlyingAddress,
      balance,
      value: null,
      apy: Number(token.market.supplyRate),
      token: plainToClass(LendingErcToken, {
        address: token.market.underlyingAddress,
        decimals: token.market.underlyingDecimals,
        name: token.market.underlyingName,
        symbol: token.market.underlyingSymbol,
        price: null,
      }),
    });
  }

  getClaimableRewardDto(reward: Asset, balance: number): IntegrationClaimableTokenDto {
    return plainToClass(IntegrationClaimableTokenDto, {
      address: reward.address,
      name: reward.name,
      symbol: reward.symbol,
      decimals: reward.decimals,
      claimableData: {
        balance,
      },
    });
  }

  /**
   * Format BaseData Types
   */
  formatBaseData<T, K>(
    address: Address,
    chain: ChainDto,
    feature: FeatureEnum,
    type: ClassConstructor<T>,
    items: K[],
  ): T {
    return plainToClass(type, {
      chain,
      projectName: ProjectEnum.compound,
      protocolName: ProtocolNameEnum.compound,
      userAddress: address,
      protocolType: ProtocolTypeEnum.lending,
      feature,
      items,
    });
  }
}

export default BasicProtocol;
