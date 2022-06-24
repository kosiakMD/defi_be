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
  FeatureEnum,
  IntegrationClaimableTokenDto,
  IntegrationFeaturesDataDto,
  LendingErcToken,
  LendingPositionDto,
  Logger,
  ProjectEnum,
  ProtocolNameEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { CallData } from '@app/common/dto/CallData';
import { HealthFactorDto } from '@app/common/dto/HealthFactor.dto';
import { BaseDataClaimable } from '@app/common/dto/base.data.claimable.dto';
import { BaseDataHealth } from '@app/common/dto/base.data.health.dto';
import { BaseDataLending } from '@app/common/dto/base.data.lending.dto';
import { normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Asset, BaseData } from '../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import BasicProtocol from './basicProtocol';
import {
  COMPOUND_LENS,
  COMPTROLLER,
  CTOKEN_DECIMALS,
  REWARD_TOKEN,
} from './compound/compound.constants';
import {
  ICompoundHttpAccount,
  ICompoundHttpCToken,
  ICompoundHttpToken,
} from './compound/compound.interfaces';
import { CToken } from './compound/contracts/CToken';
import { CompoundLens } from './compound/contracts/CompoundLens';
import { Comptroller } from './compound/contracts/Comptroller';

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
    protected readonly priceService: PriceService,
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
    const { errors: _errors, baseData: userBaseData } = await this.fillBaseData(addresses, chain);

    errors.push(..._errors);
    baseData.push(...userBaseData);

    return [baseData, errors];
  }

  private isCollateralLabel(account: ICompoundHttpAccount, tokenAddress: string): string {
    return `collateral_${account.address}_${tokenAddress}`;
  }

  private suppliedLabel(account: ICompoundHttpAccount, token: ICompoundHttpToken): string {
    return `supplied_${account.address}_${token.address}`;
  }

  private borrowedLabel(account: ICompoundHttpAccount, token: ICompoundHttpToken): string {
    return `borrowed_${account.address}_${token.address}`;
  }

  private claimableLabel(account): string {
    return `claimable_${account.id}`;
  }

  async fillBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<{ errors: string[]; baseData: BaseData[] }> {
    const errors: string[] = [];
    const baseData: BaseData[] = [];

    const [accounts, cTokenMap] = await Promise.all([
      this.getHttpAccountData(addresses),
      this.getHttpCTokenData(),
    ]);

    const tokenMap = await this.getUnderlyingAssets(
      // Will use WETH in place of ETH
      Array.from(cTokenMap.values())
        .map((c) => c.underlying_address)
        .concat(ZERO_ADDRESS),
      chain,
    );

    const promises = accounts.map(async (account) => {
      const [multicallDataResult, rewareTokenResult] = await Promise.all([
        this.getMulticallData(account, chain),
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
          account,
          rewareTokenResult,
          cTokenMap,
          tokenMap,
        );

        if (positions.items.length) baseData.push(positions);
      });
    });

    try {
      await Promise.all(promises);
      return { errors, baseData };
    } catch (err) {
      errors.push(err.message);
      return { errors, baseData };
    }
  }

  /**
   * External Data Retrieval
   */
  async getRewardToken(chain: ChainDto): Promise<Asset> {
    const { data } = await this.accountService.getAssets([REWARD_TOKEN[chain.id]], [chain.id]);
    return data[0];
  }

  async getUnderlyingAssets(assets: Address[], chain: ChainDto) {
    const { data } = await this.accountService.getAssets(assets, [chain.id]);
    return new Map(data.map((token) => [token.address.toLowerCase(), token]));
  }

  getMulticallData(account: ICompoundHttpAccount, chain: ChainDto): Promise<Map<string, CallData>> {
    const comptroller = new Comptroller(COMPTROLLER[chain.id]);
    const balanceCalls = new Map(
      account.tokens.flatMap((token) => {
        const contract = new CToken(token.address);
        return [
          [
            this.isCollateralLabel(account, token.address),
            comptroller.checkMembership(account.address, token.address),
          ],
          [this.suppliedLabel(account, token), contract.balanceOf(account.address)],
          [this.borrowedLabel(account, token), contract.borrowBalanceStored(account.address)],
        ];
      }),
    );

    const compoundLens = new CompoundLens(COMPOUND_LENS[chain.id]);
    balanceCalls.set(
      this.claimableLabel(account),
      compoundLens.getCompBalanceMetadataExt(
        REWARD_TOKEN[chain.id],
        COMPTROLLER[chain.id],
        account.address,
      ),
    );
    return this.multicall.handleInBatches(balanceCalls, chain.id);
  }

  async getHttpAccountData(addresses: Address[]): Promise<ICompoundHttpAccount[]> {
    const accountData$ = this.http.get(
      `https://api.compound.finance/api/v2/account?addresses[]=${addresses.join(
        '&addresses[]=',
      )}&page_size=1`,
    );

    const {
      data: { accounts },
    } = await firstValueFrom(accountData$);

    return accounts;
  }

  async getHttpCTokenData(): Promise<Map<Address, ICompoundHttpCToken>> {
    const tokenData$ = this.http.get(`https://api.compound.finance/api/v2/ctoken`);

    const [
      {
        data: { cToken },
      },
      { prices },
    ] = await Promise.all([
      firstValueFrom(tokenData$),
      this.priceService.getTokenPricesFetch([ZERO_ADDRESS], ChainIdEnum.eth), // all tokens are priced in eth
    ]);

    return new Map(
      cToken.map((cToken: ICompoundHttpCToken) => {
        // Update fallback price to be in USD instead of ETH
        // eslint-disable-next-line camelcase
        cToken.underlying_price.value = (
          Number(cToken.underlying_price.value) * prices[ZERO_ADDRESS]
        ).toString();

        return [cToken.token_address.toLowerCase(), cToken];
      }),
    );
  }

  getLendingPositions(
    account: ICompoundHttpAccount,
    chain: ChainDto,
    multicallResults: Map<string, CallData>,
    httpAccount: ICompoundHttpAccount,
    rewardToken: Asset,
    cTokens: Map<Address, ICompoundHttpCToken>,
    underlyingTokens: Map<Address, Asset>,
  ): BaseDataLending {
    const items = account.tokens.reduce((acc, accountToken) => {
      const cToken = cTokens.get(accountToken.address);
      const underlying = underlyingTokens.get(cToken.underlying_address ?? ZERO_ADDRESS);
      const balance = normalizeDecimals(
        multicallResults.get(this.suppliedLabel(account, accountToken)).output.data.toString(),
        CTOKEN_DECIMALS,
      );

      const isCollateral = multicallResults.get(
        this.isCollateralLabel(account, cToken.token_address),
      ).output.data;

      if (balance) {
        acc.push(
          this.getLendingPositionDto(
            cToken,
            underlying,
            balance * Number(cToken.exchange_rate.value),
            isCollateral,
          ),
        );
      }

      return acc;
    }, []);

    return this.formatBaseData(account.address, chain, FeatureEnum.lending, BaseDataLending, items);
  }

  getBorrowingPositions(
    account: ICompoundHttpAccount,
    chain: ChainDto,
    multicallResults: Map<string, CallData>,
    httpAccount: ICompoundHttpAccount,
    rewardToken: Asset,
    cTokens: Map<Address, ICompoundHttpCToken>,
    underlyingTokens: Map<Address, Asset>,
  ): BaseDataLending {
    const items = account.tokens.reduce((acc, accountToken) => {
      const cToken = cTokens.get(accountToken.address.toLowerCase());
      const underlying = underlyingTokens.get(
        // underlying_token is null for native eth
        cToken.underlying_address?.toLowerCase() ?? ZERO_ADDRESS,
      );

      const balance = normalizeDecimals(
        multicallResults.get(this.borrowedLabel(account, accountToken)).output.data.toString(),
        underlying.decimals,
      );

      if (balance) {
        acc.push(this.getBorrowingPositionDto(cToken, underlying, balance));
      }

      return acc;
    }, []);

    return this.formatBaseData(
      account.address,
      chain,
      FeatureEnum.borrowing,
      BaseDataLending,
      items,
    );
  }

  getClaimableRewards(
    account: ICompoundHttpAccount,
    chain: ChainDto,
    multicallResults: Map<string, CallData>,
    httpAccount: ICompoundHttpAccount,
    rewardToken: Asset,
  ): BaseDataClaimable {
    const items = [];
    const raw = multicallResults.get(this.claimableLabel(account)).output.data;

    const claimable = normalizeDecimals(raw.allocated, 18);

    if (claimable) {
      items.push(this.getClaimableRewardDto(rewardToken, claimable));
    }
    return this.formatBaseData(
      account.address,
      chain,
      FeatureEnum.claimable,
      BaseDataClaimable,
      items,
    );
  }

  getHealthFactor(
    account: ICompoundHttpAccount,
    chain: ChainDto,
    multicallResults: Map<string, CallData>,
    httpAccount: ICompoundHttpAccount,
  ): BaseDataHealth {
    const items = [];
    if (Number(httpAccount.health?.value)) {
      items.push(
        plainToClass(HealthFactorDto, {
          healthFactor: Number(httpAccount.health?.value),
        }),
      );
    }

    return this.formatBaseData(account.address, chain, FeatureEnum.health, BaseDataHealth, items);
  }

  getLendingPositionDto(
    ctoken: ICompoundHttpCToken,
    token: Asset,
    balance: number,
    isCollateral: boolean,
  ): LendingPositionDto {
    return plainToClass(LendingPositionDto, {
      address: ctoken.token_address,
      balance,
      value: Number(ctoken.underlying_price.value) * balance,
      apy: Number(ctoken.supply_rate.value),
      token: plainToClass(LendingErcToken, {
        address: token.address,
        decimals: token.decimals,
        name: token.name,
        symbol: token.symbol,
        price: Number(ctoken.underlying_price.value),
      }),
      isCollateral,
    });
  }

  getBorrowingPositionDto(
    ctoken: ICompoundHttpCToken,
    token: Asset,
    balance: number,
  ): LendingPositionDto {
    return plainToClass(LendingPositionDto, {
      address: ctoken.token_address,
      balance,
      value: Number(ctoken.underlying_price) * balance,
      apy: Number(ctoken.borrow_rate.value),
      token: plainToClass(LendingErcToken, {
        address: token.address,
        decimals: token.decimals,
        name: token.name,
        symbol: token.symbol,
        price: ctoken.underlying_price,
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
    type: any,
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
