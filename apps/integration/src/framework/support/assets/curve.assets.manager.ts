// eslint-disable-next-line max-classes-per-file
import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, ChainWrappedTokens, Logger } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { CurveAddresses } from '@app/common/constant/curve.addresses';
import { CallData } from '@app/common/dto/CallData';
import { concatStrings, normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { CurveCryptoFactory } from '@app/common/web3provider/contracts/protocols/curve/CurveCryptoFactory';
import { CurveFactory } from '@app/common/web3provider/contracts/protocols/curve/CurveFactory';
import { CurveProvider } from '@app/common/web3provider/contracts/protocols/curve/CurveProvider';
import { CurveRegistry } from '@app/common/web3provider/contracts/protocols/curve/CurveRegistry';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Asset } from '../../../common/interfaces/transactions.interfaces';

import { ERC20Abi } from '../../../../../../jobs/lambda_vaults/src/jobs/curve/abis/ERC20Abi';
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
    const lpTokens = tokens.filter((t) => t.underlyingAssets?.length > 1);
    let lpTokenAddresses: Set<string> = new Set<string>();
    lpTokens.forEach((lpToken) => {
      lpTokenAddresses = new Set<string>([
        ...lpTokenAddresses,
        ...this.getLpTokenAddressesRecursively(lpToken),
      ]);
    });
    const lpTokenAddressesArray = Array.from(lpTokenAddresses);
    const { registryMintersMap, nonRegistryTokens } = await this.fetchRegistryMinters(
      lpTokenAddressesArray,
      chainId,
    );
    const mintersMap = await this.fetchMinters(nonRegistryTokens as Address[], chainId);

    const registryInfoCalls = this.buildRegistryCalls(registryMintersMap, tokens);
    const calls = await this.buildCalls(nonRegistryTokens as Address[], mintersMap);
    const [callsResult, registerCallsResult] = await Promise.all([
      this.multicall.handleInBatches(calls, chainId),
      this.multicall.handleInBatches(registryInfoCalls, chainId),
    ]);

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

    const tokensFormatted = tokens.map((t) => {
      return this.processTokenBalancesRecursively(
        t,
        prices,
        callsResult,
        registryMintersMap,
        registerCallsResult,
      );
    });

    return tokensFormatted.map((t) => {
      return [
        t.address,
        {
          ...t,
          minter: registryMintersMap.get(t.address)?.minter || mintersMap.get(t.address),
        },
      ];
    });
  }

  private formatRegistryToken(token, prices, resultMap) {
    try {
      const balances = resultMap.get(getRegistryBalancesLabel(token.address)).output.data;

      const lpTokenTotalSupply = resultMap
        .get(getTotalSupplyLabel(token.address))
        ?.output.data.toString();

      const lpTotalSupplyDec = normalizeDecimals(lpTokenTotalSupply, token.decimals);

      let underlyingAssetsValue = 0;
      const underlyingAssets = token.underlyingAssets.map((coin) => {
        const coinTotalSupply = resultMap
          .get(getTotalSupplyLabel(coin.address))
          ?.output.data.toString();

        const reserve = normalizeDecimals(balances[coin.positionInPool].toString(), coin.decimals);

        coin.totalSupply = normalizeDecimals(coinTotalSupply, coin.decimals);
        if (coin.isLp) {
          const lpToken = this.formatRegistryToken(coin, prices, resultMap);
          const value = reserve * lpToken.price;
          underlyingAssetsValue += value;
          return Object.assign(lpToken, {
            reserve,
            value,
            position: coin.positionInPool,
          });
        } else {
          const price = Number(prices[coin.address]);
          const value = coin.price * reserve;
          underlyingAssetsValue += value;
          return Object.assign(coin, {
            ...tokenFieldsToRemove,
            position: coin.positionInPool,
            reserve,
            price,
            value,
          });
        }
      });
      const lpTokenPrice = underlyingAssetsValue / lpTotalSupplyDec;
      return Object.assign(token, {
        ...tokenFieldsToRemove,
        price: lpTokenPrice,
        totalSupply: lpTotalSupplyDec,
        // unique place where to set underlying assets
        underlying: underlyingAssets,
      });
    } catch (e) {
      this.logger.error(e, 'formatRegistryToken');
    }
  }

  private buildRegistryCalls(
    registryMintersMap: Map<string, { registry: string; minter: string; contract: string }>,
    tokens: Asset[],
  ) {
    const calls = new Map();
    Array.from(registryMintersMap.keys()).forEach((key) => {
      const lpTokenContract = new ERC20(key);
      let token = tokens.find((token) => token.address === key);
      if (!token) {
        tokens.forEach((t) => {
          const findToken = t.underlyingAssets?.find((ua) => ua.address === key);
          if (findToken) token = findToken as Asset;
        });
      }

      const value = registryMintersMap.get(key);

      const registry = new DynamicContract(value.registry);
      calls.set(getTotalSupplyLabel(key), lpTokenContract.totalSupply());

      calls.set(
        getRegistryBalancesLabel(key),
        registry.createCall(
          CurveContractsMap.get(CurveProviders[value.contract]).getBalances,
          value.minter,
        ),
      );

      token.underlyingAssets.forEach((coin) => {
        //ChainWrappedTokens
        const lpTokenContract = new ERC20Abi(
          coin.address === ZERO_ADDRESS
            ? ChainWrappedTokens[coin.symbol.toUpperCase()]
            : coin.address,
        );
        calls.set(getTotalSupplyLabel(coin.address), lpTokenContract.totalSupply());
      });
    });

    return calls;
  }

  private getLpTokenAddressesRecursively(lpToken): Set<string> {
    let addresses = new Set<string>();
    addresses.add(lpToken.address);
    lpToken.underlyingAssets?.forEach((ua) => {
      if (ua.underlyingAssets?.length > 1) {
        addresses = new Set<string>([...addresses, ...this.getLpTokenAddressesRecursively(ua)]);
      }
    });
    return addresses;
  }

  private getUnderlyingTokenAddressesRecursively(token): Set<string> {
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

  private processTokenBalancesRecursively(
    token,
    prices,
    callsResult: Map<string, CallData>,
    registryMintersMap: Map<string, { minter: string; registry: string }>,
    registryCallResult: Map<string, CallData>,
  ) {
    if (!token.isLp) {
      return Object.assign(token, {
        ...tokenFieldsToRemove,
        price: Number(prices[token.address]),
      });
    }
    let underlyingAssetsValue = 0;
    const underlyingAssets = token.underlyingAssets.map((ua) => {
      const balance = registryMintersMap.get(token.address)
        ? dataFrom(registryCallResult, getRegistryBalancesLabel(token.address))?.[ua.positionInPool]
        : dataFrom(callsResult, getBalancesLabel(token.address, ua.positionInPool))?.toString();
      const balanceNormalized = normalizeDecimals(balance || 0, ua.decimals);
      if (ua.underlyingAssets?.length > 1) {
        const lpToken = this.processTokenBalancesRecursively(
          ua,
          prices,
          callsResult,
          registryMintersMap,
          registryCallResult,
        );
        const value = balanceNormalized * lpToken.price;
        underlyingAssetsValue += value;
        return Object.assign(lpToken, {
          reserve: balanceNormalized,
          value: value,
          position: ua.positionInPool,
          balance: balanceNormalized,
        });
      }
      const price = Number(prices[ua.address]);
      const value = balanceNormalized * price;
      underlyingAssetsValue += value;
      return Object.assign(ua, {
        ...tokenFieldsToRemove,
        position: ua.positionInPool,
        reserve: balanceNormalized,
        price,
        value,
        balance: balanceNormalized,
      });
    });

    const lpTokenTotalSupply: BN =
      registryCallResult.get(getTotalSupplyLabel(token.address))?.output.data ||
      dataFrom(callsResult, getTotalSupplyLabel(token.address));

    const lpTokenTotalSupplyNormalized: number =
      normalizeDecimals(lpTokenTotalSupply?.toString(), token.decimals) || 0;

    const lpTokenPrice = underlyingAssetsValue / lpTokenTotalSupplyNormalized;

    return Object.assign(token, {
      ...tokenFieldsToRemove,
      price: lpTokenPrice,
      totalSupply: lpTokenTotalSupplyNormalized,
      // unique place where to set underlying assets
      underlying: underlyingAssets,
    });
  }

  private async handleMainRegistry(
    addresses: string[],
    registry: string,
    chainId: ChainIdEnum,
    contract: string,
  ) {
    if (registry === ZERO_ADDRESS) return new Map();
    const registryContract = new DynamicContract(registry);
    const resultMap = new Map();

    const minters = await this.multicall.callArray(
      addresses.map((address) =>
        registryContract.createCall(CurveRegistry.getPoolFromLpToken, address),
      ),
      chainId,
    );

    minters.forEach((minter, index) => {
      if (minter !== ZERO_ADDRESS) {
        resultMap.set(addresses[index], { minter, registry, contract });
      }
    });
    return resultMap;
  }

  private async handleCryptoPoolFactory(
    addresses: string[],
    registry: string,
    chainId: ChainIdEnum,
  ) {
    if (registry === ZERO_ADDRESS) return new Map();
    const registryContract = new DynamicContract(registry);
    const poolCount = await this.multicall.call(
      registryContract.createCall(CurveRegistry.poolCount),
      chainId,
    );

    const pools = await this.multicall.callArray(
      Array.from(Array(Number(poolCount)).keys()).map((id) =>
        registryContract.createCall(CurveRegistry.poolList, id),
      ),
      chainId,
    );

    const poolsLps = await this.multicall.callArray(
      pools.map((pool) => registryContract.createCall(CurveRegistry.getToken, pool)),
      chainId,
    );
    const lpsMap = poolsLps.reduce((resp, lp, index) => {
      resp.set(lp.toLowerCase(), pools[index]);
      return resp;
    }, new Map());

    const resultMap = new Map();
    addresses.forEach((address) => {
      const pool = lpsMap.get(address);
      if (pool) {
        resultMap.set(address, {
          minter: pool.toLowerCase(),
          registry,
          contract: CurveProviders.cryptoPoolFactory,
        });
      }
    });
    return resultMap;
  }

  private async handleMetaPoolFactory(addresses: string[], registry: string, chainId: ChainIdEnum) {
    if (registry === ZERO_ADDRESS) return new Map();
    const registryContract = new DynamicContract(registry);
    const resultMap = new Map();

    const poolCount = await this.multicall.call(
      registryContract.createCall(CurveRegistry.poolCount),
      chainId,
    );

    const poolList = await this.multicall.callArray(
      Array.from(Array(Number(poolCount)).keys()).map((key) =>
        registryContract.createCall(CurveRegistry.poolList, key),
      ),
      chainId,
    );

    const poolsMap = poolList.reduce((map, item) => {
      map.set(item.toLowerCase(), item);
      return map;
    }, new Map());

    addresses.forEach((addr) => {
      const factoryPool = poolsMap.get(addr);
      if (factoryPool) {
        resultMap.set(addr, {
          minter: addr,
          registry,
          contract: CurveProviders.metaPoolFactory,
        });
      }
    });
    return resultMap;
  }

  private async fetchRegistryMinters(tokenAddresses: string[], chainId: ChainIdEnum) {
    const curveProvider = new DynamicContract(CurveAddresses.addressProvider);

    const multResp = await this.multicall.callArray(
      [0, 3, 5, 6].map((value) => curveProvider.createCall(CurveProvider.getIdInfo, value)),
      chainId,
    );

    const [mainRegistryMap, metaPoolFactoryMap, cryptoSwapRegistryMap, cryptoPoolFactoryMap] =
      await Promise.all([
        this.handleMainRegistry(
          tokenAddresses,
          multResp[0].addr,
          chainId,
          CurveProviders.mainRegistry,
        ),
        this.handleMetaPoolFactory(tokenAddresses, multResp[1].addr, chainId),
        this.handleMainRegistry(
          tokenAddresses,
          multResp[2].addr,
          chainId,
          CurveProviders.cryptoSwapFactory,
        ),
        this.handleCryptoPoolFactory(tokenAddresses, multResp[3].addr, chainId),
      ]);

    const registryMintersMap = new Map<
      string,
      { minter: string; registry: string; contract: string }
    >();
    const nonRegistryTokens: string[] = [];
    tokenAddresses.forEach((address) => {
      const registryInfo =
        mainRegistryMap.get(address) ||
        cryptoSwapRegistryMap.get(address) ||
        metaPoolFactoryMap.get(address) ||
        cryptoPoolFactoryMap.get(address);

      registryInfo
        ? registryMintersMap.set(address, registryInfo)
        : nonRegistryTokens.push(address);
    });
    return { registryMintersMap, nonRegistryTokens };
  }

  private async buildCalls(lpTokens, mintersMap: Map<string, string>) {
    let calls: Map<string, CallData> = new Map<string, CallData>();
    lpTokens.forEach((t) => {
      calls = new Map<string, CallData>([
        ...calls.entries(),
        ...this.buildCallsForLpToken(t, mintersMap).entries(),
      ]);
    });
    return calls;
  }

  private buildCallsForLpToken(lpToken, mintersMap: Map<string, string>) {
    let callsMap: Map<string, CallData> = new Map<string, CallData>();
    callsMap.set(
      getTotalSupplyLabel(lpToken.address),
      plainToClass(CallData, {
        address: lpToken.address,
        abi: ERC20.totalSupply,
      }),
    );

    if (lpToken.underlyingAssets?.length > 1) {
      lpToken.underlyingAssets.forEach((ua) => {
        const minter = mintersMap.get(lpToken.address);
        callsMap.set(
          getBalancesLabel(lpToken.address, ua.positionInPool),
          plainToClass(CallData, {
            address: minter,
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

  async fetchMinters(
    tokenAddresses: Address[],
    chainId: ChainIdEnum,
  ): Promise<Map<string, string>> {
    const minterCalls = tokenAddresses.map((tAddress) => {
      const contract = new DynamicContract(tAddress);
      return contract.createCall(Minter.minter);
    });

    const minters = await this.multicall.callArray(minterCalls, chainId);
    return new Map(minters.map((m, index) => [tokenAddresses[index], m.toLowerCase()]));
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

function getRegistryBalancesLabel(lpAddress): string {
  return concatStrings(lpAddress, 'balances');
}

function getTotalSupplyLabel(tokenAddress): string {
  return concatStrings(tokenAddress, 'totalSupply');
}

function dataFrom(callsResult: Map<string, CallData>, label: string) {
  return callsResult.get(label)?.output.data;
}

export enum CurveProviders {
  mainRegistry = 'mainRegistry',
  cryptoSwapFactory = 'cryptoSwapFactory',
  cryptoPoolFactory = 'cryptoPoolFactory',
  metaPoolFactory = 'metaPoolFactory',
}

export const CurveContractsMap = new Map([
  [CurveProviders.mainRegistry, CurveRegistry],
  [CurveProviders.cryptoPoolFactory, CurveCryptoFactory],
  [CurveProviders.cryptoSwapFactory, CurveRegistry],
  [CurveProviders.metaPoolFactory, CurveFactory],
]);
