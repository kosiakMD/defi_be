// eslint-disable-next-line max-classes-per-file
import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import { CurrencyIdEnum } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import {
  IntegrationStakingPositionDto,
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
} from '@app/common/jobs/staking';
import { concatStrings } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { toDecimals } from '../../utils/number';
import { isTimeToDo } from '../../utils/time';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { IntegrationDataConverter } from '../integration.data.converter';
import { DbMapping } from '../utils/dbmapping';
import { Abis } from './abis/abis.common';

@Injectable()
export abstract class BadgerStaking {
  public chain;
  public feature;
  public protocol;
  public placeholder;
  public features: any;

  protected dbMapping: DbMapping;
  protected mapping = [];
  protected vaultsToCRVPools;
  protected abis;
  protected addresses;

  static cvxStategy = '0xa696a63cc78dffa1a63e9e50587c197387ff6c7e';
  static cvxVault = '0x4b92d19c11435614cd49af1b589001b7c08cd4d5';
  static bDIGGPool = '0x7e7e112a68d8d2e221e11047a72ffc1065c38e1a';
  static bBadgerPool = '0x19d97d8fa813ee2f51ad4b4e04ea08baf4dffc28';

  protected readonly logger: Logger;
  protected readonly multicallService: MulticallAggregator;
  protected readonly accountService: AccountService;
  protected readonly storeService: StoreService;
  protected readonly priceService: PriceService;

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;

    if (
      !jobMapping.mapping ||
      isTimeToDo(jobMapping.updatedAt ?? jobMapping.createdAt, jobMapping.updateFrequency)
    ) {
      this.logger.log('it is time to update mapping', this.placeholder);
      jobMapping = await this.buildInitialMapping(jobMapping);
    }

    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
  }

  abstract buildInitialMapping(jobMapping: TrackedVault): Promise<TrackedVault>;

  async getTokenData(tokenAddress) {
    const calls = new Map<string, CallData>();
    calls.set(this.getNameLabel(tokenAddress), {
      address: tokenAddress,
      abi: Abis.getName,
      input: {
        data: [],
      },
      output: {},
    });
    calls.set(this.getDecimalsLabel(tokenAddress), {
      address: tokenAddress,
      abi: Abis.getDecimals,
      input: {
        data: [],
      },
      output: {},
    });

    calls.set(this.getSymbolLabel(tokenAddress), {
      address: tokenAddress,
      abi: Abis.getSymbol,
      input: {
        data: [],
      },
      output: {},
    });

    const multicallRsp: Map<string, CallData> = await this.multicallService.handleInBatches(
      calls,
      this.chain,
    );

    return {
      name: multicallRsp.get(this.getNameLabel(tokenAddress)).output.data,
      symbol: multicallRsp.get(this.getSymbolLabel(tokenAddress)).output.data,
      decimals: multicallRsp.get(this.getDecimalsLabel(tokenAddress)).output.data,
    };
  }

  async saveTokens(
    lpTokenAddress: string,
    rewardTokenAddress: string,
  ): Promise<[IntegrationERC20TokenDto, IntegrationClaimableTokenDto, LiquidityPoolTokenDto]> {
    const rewardTokenData: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
      rewardTokenAddress,
      this.chain,
    );

    const rewardToken = plainToClass(IntegrationClaimableTokenDto, {
      address: rewardTokenData.address,
      name: rewardTokenData.name,
      symbol: rewardTokenData.symbol,
      decimals: rewardTokenData.decimals,
    });

    const poolTokenData: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
      lpTokenAddress,
      this.chain,
    );

    const stakingToken: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {
      address: poolTokenData.address,
      name: poolTokenData.name,
      symbol: poolTokenData.symbol,
      decimals: poolTokenData.decimals,
    });

    return [stakingToken, rewardToken, poolTokenData];
  }

  protected mapVaultsToPools(pools) {
    const vaultsToPoolsMap = new Map<string, any>();

    this.addresses.stakingKeys.map((k) => {
      const vaultAddress = this.addresses.settVaults[k].toLowerCase();
      const poolAddress = pools[k]?.toLowerCase();

      vaultsToPoolsMap.set(vaultAddress, {
        vault: vaultAddress,
        pool: poolAddress,
      });
    });

    return vaultsToPoolsMap;
  }

  async updateWithChainData(): Promise<any[]> {
    const vaultToStrategy: Map<string, string> = new Map<string, string>();
    this.addresses.stakingKeys.forEach((stakingKey) => {
      vaultToStrategy.set(
        this.addresses.settVaults[stakingKey].toLowerCase(),
        this.addresses.settStrategies[stakingKey].toLowerCase(),
      );
    });

    const batchCalls = [];

    this.mapping.forEach((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        const strategy = vaultToStrategy.get(m.address.toLowerCase());

        batchCalls.push(
          ...this.getCallsForWant(m).entries(),
          ...this.getCallsForVault(m.address.toLowerCase()).entries(),
          ...this.getCallsForStrategy(strategy).entries(),
        );
      }
    });

    const batchCallsMap: Map<string, CallData> = new Map<string, CallData>(batchCalls);

    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');

    const [{ prices }, multicallRsp] = await Promise.all([
      this.priceService.getCurrentPrices(pricedTokenAddresses, CurrencyIdEnum.usd, this.chain),
      this.multicallService.handleInBatches(batchCallsMap, this.chain),
    ]);

    // remove zero prices
    this.removeZeroPrices(prices);

    this.mapping = await Promise.all(
      this.mapping.map(async (m) => {
        if (m instanceof IntegrationStakingPositionDto) {
          const strategy = vaultToStrategy.get(m.address.toLowerCase());

          m = this.getDataFromMulticallRsp(multicallRsp, m, prices, strategy);

          m.rewards[0].price = Number(prices[m.rewards[0].address.toLowerCase()]);

          m.rewards[0].apr = null;

          return m;
        }
      }),
    );

    return this.mapping;
  }

  protected getDataFromMulticallRsp(
    multicallRsp: Map<string, CallData>,
    stakingPos: IntegrationStakingPositionDto,
    prices,
    strategy,
  ) {
    const stakingTokenAddress = stakingPos.stakingToken.address.toLowerCase();

    if (stakingPos.stakingToken.tokens.length > 0) {
      let totalSupply: BigNumber;
      let balance: BigNumber;
      if (stakingTokenAddress === BadgerStaking.cvxVault) {
        totalSupply = multicallRsp.get(this.getBalanceLabel(strategy)).output.data;
        balance = multicallRsp.get(this.totalSupplyLabel(stakingTokenAddress)).output.data;
      } else {
        totalSupply = multicallRsp.get(this.totalSupplyLabel(stakingTokenAddress)).output.data;
        balance = multicallRsp.get(this.getBalanceLabel(strategy)).output.data;
      }

      stakingPos.staked = toDecimals(balance, stakingPos.stakingToken.decimals).toString();
      stakingPos.stakingToken.balance = toDecimals(balance, stakingPos.stakingToken.decimals);

      stakingPos.stakingToken.totalSupply = toDecimals(
        totalSupply,
        stakingPos.stakingToken.decimals,
      );
      const poolShare = stakingPos.stakingToken.balance / stakingPos.stakingToken.totalSupply;

      const crvPool = this.vaultsToCRVPools.get(stakingPos.address.toLowerCase()).pool;
      if (crvPool) {
        const tokenCount = stakingPos.stakingToken.tokens.length;
        const reserves = [];

        for (let i = 0; i < tokenCount; i++) {
          reserves.push(
            multicallRsp.get(this.getCoinBalanceLabel(stakingPos.address, i)).output.data,
          );
        }
        stakingPos.stakingToken.tokens.map((t, i) => {
          t.reserve = toDecimals(reserves[i], t.decimals);
          t.price = Number(prices[t.address.toLowerCase()]);
          t.balance = t.reserve * poolShare;
          t.value = t.balance * t.price;

          stakingPos.stats.tvl += t.value;

          return t;
        });
      } else if (stakingPos.stakingToken.tokens.length === 1) {
        const vault = stakingPos.address.toLowerCase();
        let reserve;

        if (stakingTokenAddress === BadgerStaking.cvxVault) {
          reserve = multicallRsp.get(this.getBalanceLabel(strategy)).output.data;
        } else {
          reserve = multicallRsp.get(this.totalSupplyLabel(vault)).output.data;
        }

        stakingPos.stakingToken.tokens.map((t) => {
          t.reserve = toDecimals(reserve, t.decimals);
          t.price = Number(prices[t.address.toLowerCase()]);
          t.balance = t.reserve * poolShare;
          t.value = t.balance * t.price;

          stakingPos.stats.tvl += t.value;

          return t;
        });
      } else {
        const { _reserve0, _reserve1 } = multicallRsp.get(this.getReservesLabel(stakingPos)).output
          .data;

        stakingPos.stakingToken.tokens.map((t) => {
          t.reserve =
            t.positionInPool === 0
              ? toDecimals(_reserve0, t.decimals)
              : toDecimals(_reserve1, t.decimals);
          t.price = Number(prices[t.address.toLowerCase()]);
          t.balance = t.reserve * poolShare;
          t.value = t.balance * t.price;

          stakingPos.stats.tvl += t.value;

          return t;
        });
      }
    } else if ([BadgerStaking.bDIGGPool, BadgerStaking.bBadgerPool].includes(stakingPos.address)) {
      // bBadger or bDIGG pool
      const vault = stakingPos.address.toLowerCase();
      const balance = toDecimals(
        multicallRsp.get(this.getBalanceLabel(vault)).output.data,
        stakingPos.rewards[0].decimals,
      );
      const token0 = stakingPos.rewards[0].address.toLowerCase();
      const token0Price = Number(prices[token0]);
      stakingPos.stats.tvl += token0Price * balance;
    } else {
      stakingPos.stakingToken.price = Number(prices[stakingTokenAddress]);
      stakingPos.stakingToken.value =
        stakingPos.stakingToken.balance * stakingPos.stakingToken.price;
      stakingPos.stats.tvl += stakingPos.stakingToken.value;
    }
    return stakingPos;
  }

  protected getPricedTokensSet(): Set<string> {
    const addressesSet: Set<string> = new Set<string>();
    this.mapping.forEach((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        if (m.stakingToken.tokens.length > 0) {
          m.stakingToken.tokens.forEach((t) => {
            addressesSet.add(t.address.toLowerCase());
          });
        } else {
          addressesSet.add(m.stakingToken.address.toLowerCase());
        }
      } else {
        addressesSet.add(m.stakingToken.address.toLowerCase());
      }

      m.rewards.forEach((r) => {
        addressesSet.add(r.address.toLowerCase());
      });

      addressesSet.add(this.addresses.tokens.wBTC);
    });
    return addressesSet;
  }

  abstract getCallsForWant(stakingPosition: IntegrationStakingPositionDto);

  protected getCallsForVault(vault: string) {
    const calls: Map<string, CallData> = new Map<string, CallData>();

    if (vault.toLowerCase() !== BadgerStaking.cvxVault) {
      calls.set(this.getBalanceLabel(vault), {
        address: vault,
        abi: Abis.getBalance,
        input: {
          data: [],
        },
        output: {},
      });
    } else {
      calls.set(this.getBalanceLabel(vault), {
        address: vault,
        abi: Abis.totalAssets,
        input: {
          data: [],
        },
        output: {},
      });
    }

    calls.set(this.totalSupplyLabel(vault), {
      address: vault,
      abi: Abis.totalSupply,
      input: {
        data: [],
      },
      output: {},
    });

    return calls;
  }

  protected getCallsForStrategy(strategy: string) {
    const calls: Map<string, CallData> = new Map<string, CallData>();

    calls.set(this.getBalanceLabel(strategy), {
      address: strategy,
      abi:
        strategy.toLowerCase() !== BadgerStaking.cvxStategy
          ? Abis.stratGetBalanceOf
          : Abis.strategyTotalAssets,
      input: {
        data: [],
      },
      output: {},
    });

    return calls;
  }

  protected abstract removeZeroPrices(prices): void;

  protected getWantLabel(settStrategy: string) {
    return concatStrings('getWant', settStrategy);
  }

  protected getRewardAddressLabel(settStrategy: string) {
    return concatStrings('getReward', settStrategy);
  }

  protected getReservesLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings('getReserves', stakingPosition.stakingToken.address);
  }

  protected totalSupplyLabel(address: string) {
    return concatStrings('totalSupply', address);
  }

  protected getBalanceLabel(vault: string) {
    return concatStrings('balance', vault);
  }

  protected getCoinLabel(contract: string, i: number) {
    return concatStrings('coin', contract, i);
  }

  protected getCoinBalanceLabel(contract: string, i: number) {
    return concatStrings('coinBalance', contract, i);
  }

  protected getSymbolLabel(tokenAddress: string) {
    return concatStrings('symbol', tokenAddress);
  }

  protected getDecimalsLabel(tokenAddress: string) {
    return concatStrings('decimals', tokenAddress);
  }

  protected getNameLabel(tokenAddress: string) {
    return concatStrings('name', tokenAddress);
  }

  protected getTokenLabel(address: string, i: number) {
    return concatStrings('token', address, i);
  }
}
