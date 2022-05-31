// eslint-disable-next-line max-classes-per-file
import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, Logger } from '@app/common';
import { CallData } from '@app/common/dto/call-data';
import { concatStrings, normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/dynamic-contract';
import { ERC20 } from '@app/common/web3provider/contracts/eRC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../modules/microservices/account.service';
import { PriceService } from '../../../modules/microservices/price.service';
import { IAssetsManager } from '../interfaces/assets.interface';

@Injectable()
export class CurveAssetsManager implements IAssetsManager {
  constructor(
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
  ) {}

  async getTokens(addresses: Address[], chainId: ChainIdEnum): Promise<any> {
    const { data: tokens } = await this.accountService.getAssets(addresses, [chainId]);
    const lpTokens = tokens.filter((t) => t.isLp === true);
    let lpTokenAddresses: Set<string> = new Set<string>();
    lpTokens.forEach((lpToken) => {
      lpTokenAddresses = new Set<string>([
        ...lpTokenAddresses,
        ...this.getLpTokenAddressesRecursively(lpToken),
      ]);
    });
    const lpTokenAddressesArray = Array.from(lpTokenAddresses);
    const tokenMinters = await this.fetchMinters(lpTokenAddressesArray, chainId);
    const mintersMap: Map<string, string> = new Map<string, string>(
      tokenMinters.map((minter, idx) => {
        return [lpTokenAddressesArray[idx], minter];
      }),
    );
    const calls = this.buildCalls(lpTokens, mintersMap);
    const callsResult = await this.multicall.handleInBatches(calls, chainId);

    let tokenAddresses = new Set<string>();
    tokens.forEach((token) => {
      tokenAddresses = new Set<string>([
        ...tokenAddresses,
        ...this.getUnderlyingTokenAddressesRecursively(token),
      ]);
    });

    const { prices } = await this.priceService.getTokenPricesFetch(
      Array.from(tokenAddresses),
      chainId,
    );

    const tokensFormatted = tokens.map((t) =>
      this.processTokenBalancesRecursively(t, prices, callsResult),
    );

    return tokensFormatted.map((t) => {
      return [
        t.address,
        {
          ...t,
          minter: mintersMap.get(t.address),
        },
      ];
    });
  }

  protected getLpTokenAddressesRecursively(lpToken): Set<string> {
    let addresses = new Set<string>();
    addresses.add(lpToken.address);
    lpToken.underlyingAssets?.forEach((ua) => {
      if (ua.isLp) {
        addresses = new Set<string>([...addresses, ...this.getLpTokenAddressesRecursively(ua)]);
      }
    });
    return addresses;
  }

  protected getUnderlyingTokenAddressesRecursively(token): Set<string> {
    let addresses = new Set<string>();
    if (!token.isLp) {
      addresses.add(token.address);
    }
    token.underlyingAssets?.forEach((ua) => {
      addresses.add(ua.address);
      if (ua.isLp) {
        addresses = new Set<string>([
          ...addresses,
          ...this.getUnderlyingTokenAddressesRecursively(ua),
        ]);
      }
    });
    return addresses;
  }

  protected processTokenBalancesRecursively(token, prices, callsResult: Map<string, CallData>) {
    if (!token.isLp) {
      return Object.assign(token, {
        ...tokenFieldsToRemove,
        price: Number(prices[token.address]),
      });
    }
    let underlyingAssetsValue = 0;
    const underlyingAssets = token.underlyingAssets.map((ua) => {
      const balance = dataFrom(
        callsResult,
        getBalancesLabel(token.address, ua.positionInPool),
      ).toString();
      const balanceNormalized = normalizeDecimals(balance, ua.decimals);
      if (ua.isLp) {
        const lpToken = this.processTokenBalancesRecursively(ua, prices, callsResult);
        const value = balanceNormalized * lpToken.price;
        underlyingAssetsValue += value;
        return Object.assign(lpToken, {
          reserve: balanceNormalized,
          value: value,
          position: ua.positionInPool,
        });
      }
      const price = Number(prices[ua.address]);
      const value = balanceNormalized * price;
      underlyingAssetsValue += value;
      return Object.assign(ua, {
        ...tokenFieldsToRemove,
        position: ua.positionInPool,
        reserve: balanceNormalized,
        price: price,
        value: value,
      });
    });
    const lpTokenTotalSupply: BN = dataFrom(callsResult, getTotalSupplyLabel(token.address));
    const lpTokenTotalSupplyNormalized: number = normalizeDecimals(
      lpTokenTotalSupply.toString(),
      token.decimals,
    );
    const lpTokenPrice = underlyingAssetsValue / lpTokenTotalSupplyNormalized;
    return Object.assign(token, {
      ...tokenFieldsToRemove,
      price: lpTokenPrice,
      totalSupply: lpTokenTotalSupplyNormalized,
      // unique place where to set underlying assets
      underlying: underlyingAssets,
    });
  }

  protected buildCalls(lpTokens, mintersMap: Map<string, string>) {
    let calls: Map<string, CallData> = new Map<string, CallData>();
    lpTokens.forEach((t) => {
      calls = new Map<string, CallData>([
        ...calls.entries(),
        ...this.buildCallsForLpToken(t, mintersMap).entries(),
      ]);
    });
    return calls;
  }

  protected buildCallsForLpToken(lpToken, mintersMap: Map<string, string>) {
    let callsMap: Map<string, CallData> = new Map<string, CallData>();
    callsMap.set(
      getTotalSupplyLabel(lpToken.address),
      plainToClass(CallData, {
        address: lpToken.address,
        abi: ERC20.totalSupply,
      }),
    );
    if (lpToken.underlyingAssets?.length > 0) {
      lpToken.underlyingAssets.forEach((ua) => {
        callsMap.set(
          getBalancesLabel(lpToken.address, ua.positionInPool),
          plainToClass(CallData, {
            address: mintersMap.get(lpToken.address),
            abi: Minter.balances,
            input: {
              data: [ua.positionInPool],
            },
          }),
        );
        if (ua.isLp) {
          callsMap = new Map<string, CallData>([
            ...callsMap.entries(),
            ...this.buildCallsForLpToken(ua, mintersMap).entries(),
          ]);
        }
      });
    }
    return callsMap;
  }

  async fetchMinters(tokenAddresses: Address[], chainId: ChainIdEnum) {
    const minterCalls = tokenAddresses.map((tAddress) => {
      const contract = new DynamicContract(tAddress);
      return contract.createCall(Minter.minter);
    });

    const minters = await this.multicall.callArray(minterCalls, chainId);
    return minters.map((m) => m.toLowerCase());
  }
}

export class Minter {
  static readonly minter: AbiItem = {
    inputs: [],
    name: 'minter',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly balances: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'balances',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  };
}

const tokenFieldsToRemove = {
  id: undefined,
  isLp: undefined,
  chain: undefined,
  isTracked: undefined,
  underlyingAssets: undefined,
  positionInPool: undefined,
};

function getBalancesLabel(lpAddress, positionInPool): string {
  return concatStrings(lpAddress, positionInPool);
}

function getTotalSupplyLabel(tokenAddress): string {
  return concatStrings(tokenAddress, 'totalSupply');
}

function dataFrom(callsResult: Map<string, CallData>, label: string) {
  return callsResult.get(label).output.data;
}
