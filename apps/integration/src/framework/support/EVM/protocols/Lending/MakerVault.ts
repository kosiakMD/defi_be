import { Cache } from 'cache-manager';
import { ethers } from 'ethers';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { chunk, normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { FailedCacheDataException } from '../../../exceptions';
import { INamedFunctionPredicates, IProtocolMeta } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  IBorrowTokenMinimal,
  IBorrowTokenOpportunity,
  IBorrowTokenUserEntity,
} from '../../../interfaces/tokens.borrowed.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { EVMCore } from '../../EVMCore';
import {
  GraphQLResponse,
  PoolInterface,
  PoolsQuery,
  PoolsQueryInterface,
} from '../../Subgraphs/MakerDAOSubgraph';

type ICustomBorrowTokenMinimal = IBorrowTokenMinimal<{ rate: number }>;

type ILendingFeatureEntryMinimal = BaseWithTokens<
  ISupplyTokenMinimal,
  void,
  ICustomBorrowTokenMinimal,
  { name: string }
>;
type ILendingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  void,
  IBorrowTokenOpportunity,
  { name: string }
>;
type ILendingFeatureUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry,
  void,
  IBorrowTokenUserEntity,
  { name: string }
> & { debtRatio: number };

interface RawVaultInterface {
  id: number;
  urn: string;
  ilk: string;
}

export interface MakerVaultInterface extends IProtocolMeta {
  context: {
    subgraph: string;
  };
}

const PROXY_REGISTRY = '0x4678f0a6958e4D2Bc4F1BAF7Bc52E8F3564f3fE4';
const GET_CDPS = '0x36a724Bd100c39f0Ea4D3A20F7097eE01A8Ff573';
const CDP_MANAGER = '0x5ef30b9986345249bc32d8928B7ee64DE9435E39';
const VAT = '0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b';

export class MakerVault extends EVMCore<
  ILendingFeatureEntryMinimal,
  ILendingFeatureOpportunity,
  ILendingFeatureUserEntry,
  MakerVaultInterface
> {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
    protected configService: ConfigService,
  ) {
    super();
  }

  async getCacheableOpportunityData(): Promise<ILendingFeatureEntryMinimal[]> {
    const { data } = await firstValueFrom(
      this.httpService.post<GraphQLResponse<PoolsQueryInterface>>(this.meta.context.subgraph, {
        query: PoolsQuery,
      }),
    );

    if ('errors' in data) {
      throw new FailedCacheDataException(this);
    }

    return data.data.pools.map(this.toFeatureEntryMinimal.bind(this));
  }

  private toFeatureEntryMinimal(pool: PoolInterface): ILendingFeatureEntryMinimal {
    return {
      id: pool.id,
      chain: this.meta.chain,
      feature: this.meta.feature,
      meta: {
        name: pool.name,
      },
      supply: {
        token: {
          address: pool.supply.address,
        },
        totalSupplied: pool.totalSupplied,
      },
      borrow: {
        token: {
          address: pool.borrow.address,
        },
        extra: { rate: Number(pool.rates[0].rate) / 100 },
        totalBorrowed: pool.totalBorrowed,
      },
    };
  }

  /**
   * @override as totalSupplied is always 18 decimals & there is no supply APY
   */
  protected formatOpportunitySuppliedToken(
    supplied: ISupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalSupplied = normalizeDecimals(supplied.totalSupplied, 18);
    return {
      token,
      tvl: totalSupplied * token.price,
    };
  }

  /**
   * @override
   */
  protected formatBorrowApy(borrow: ICustomBorrowTokenMinimal) {
    return { variableApy: borrow.extra.rate };
  }

  async getUsersData(
    addresses: Address[],
  ): Promise<{ data: Map<string, ILendingFeatureUserEntry[]>; errors: Error[] }> {
    const { data: pools } = await this.getPoolData();
    const poolsByIlk = new Map(pools.map((pool) => [pool.meta.name, pool]));

    // Ensure all requested users have a placement (even if 0 positions)
    const results = new Map<Address, ILendingFeatureUserEntry[]>(
      addresses.map((addr) => [addr, [] as ILendingFeatureUserEntry[]]),
    );

    // keyed per user address
    const proxies = await this.getProxyAddresses(addresses);
    // keyed per user address
    const cdps = await this.getRawVaults(proxies);

    const urns = await this.getUrns(cdps);

    const rawResults = await Promise.all(
      addresses.map(async (address) => {
        const positions = [];

        const vaults = urns.get(address);

        vaults.forEach((vault) => {
          const pool = poolsByIlk.get(vault.name);
          const supply = normalizeDecimals(vault.ink, 18); // always 18
          const borrow = normalizeDecimals(vault.art, 18) * normalizeDecimals(vault.rate, 27); // always 18
          //   // Filter out old/empty vaults
          if (!supply && !borrow) return;

          const spot =
            (normalizeDecimals(vault.spot, 27) * pool.borrow.token.price * supply) /
            (borrow * pool.borrow.token.price);

          positions.push({
            ...pool,
            debtRatio: spot,
            supply: {
              ...pool.supply,
              amount: supply,
              value: supply * pool.supply.token.price,
            },
            borrow: {
              ...pool.borrow,
              amount: borrow,
              value: borrow * pool.borrow.token.price,
            },
          });
        });

        return { address, positions };
      }),
    );

    rawResults.forEach(({ address, positions }) => {
      results.set(address, positions);
    });

    return { data: results, errors: [] };
  }

  private async getUrns(cdps: Map<Address, RawVaultInterface[]>) {
    try {
      const { functions } = await this.getContract(VAT, {
        urns: () => (item) => item.name === 'urns',
        ilks: () => (item) => item.name === 'ilks',
      });

      const provider = new ethers.providers.JsonRpcProvider(
        (this.multicall.web3(this.meta.chain).currentProvider as any).host,
      );
      const urnPromises = [];
      const ilkPromises = [];
      const contract = new ethers.Contract(VAT, [functions.urns, functions.ilks], provider);
      cdps.forEach((vaults) => {
        vaults.forEach((vault) => {
          urnPromises.push(contract.urns(vault.ilk, vault.urn));
          ilkPromises.push(contract.ilks(vault.ilk)); // TODO: this is shared by pool
        });
      });

      const urnResults = await Promise.allSettled(urnPromises);
      const ilkResults = await Promise.allSettled(ilkPromises);
      const output = new Map();

      let idx = 0;
      cdps.forEach((vaults, address) => {
        const user = [];
        vaults.forEach((vault) => {
          const ilkResult = ilkResults[idx];
          const urnResult = urnResults[idx++];
          if (urnResult.status !== 'fulfilled' || ilkResult.status !== 'fulfilled') return;
          const { ink, art } = urnResult.value;
          const { Art, rate, spot, line, dust } = ilkResult.value;
          user.push({
            id: vault.id,
            ilk: vault.ilk,
            urn: vault.urn,
            name: this.ilkToName(vault.ilk),
            ink: ink.toString(), // user colateral
            art: art.toString(), // normalized user debt
            Art, // total normalized debt
            rate: rate.toString(), // debt multiplier
            spot: spot.toString(), // collateral price with safety margin, i.e. the maximum stablecoin allowed per unit of collateral
            line: line.toString(), // the debt ceiling for a specific collateral type.
            dust, // the minimum possible debt of a Vault.
          });
        });
        output.set(address, user);
      });

      return output;
    } catch (err) {
      throw new Error('Failed to get users Urn details');
    }
  }

  private async getRawVaults(
    proxies: Map<Address, Address>,
  ): Promise<Map<Address, RawVaultInterface[]>> {
    try {
      const { functions } = await this.getContract(GET_CDPS, {
        getCdps: () => (item) => item.name === 'getCdpsAsc',
      });

      const promises = [];
      const provider = new ethers.providers.JsonRpcProvider(
        (this.multicall.web3(this.meta.chain).currentProvider as any).host,
      );
      const contract = new ethers.Contract(GET_CDPS, [functions.getCdps], provider);
      proxies.forEach((proxy) => {
        promises.push(contract.getCdpsAsc(CDP_MANAGER, proxy));
      });
      const results = await Promise.allSettled(promises);
      const output = new Map();
      let idx = 0;
      proxies.forEach((proxy, address) => {
        const result = results[idx++];
        if (result.status !== 'fulfilled') return;

        const { ids, urns, ilks } = result.value;
        const vaults = ids.reduce((acc, id, idx) => {
          acc.push({ id, urn: urns[idx], ilk: ilks[idx] });
          return acc;
        }, [] as RawVaultInterface[]);

        output.set(address, vaults);
      });
      return output;
    } catch (err) {
      throw new Error('Failed to get users ids/urns/ilks');
    }
  }

  private async getProxyAddresses(addresses: Address[]): Promise<Map<Address, Address>> {
    try {
      const calls = new Map();
      const { functions, contract } = await this.getContract(PROXY_REGISTRY, {
        proxy: () => (item) => item.name === 'proxies',
      });

      addresses.forEach((address) => {
        calls.set(address, contract.createCall(functions.proxy, address));
      });
      const results = await this.multicall.handleInBatches(calls, this.meta.chain);

      const output = new Map();
      addresses.forEach((address) => {
        output.set(address, results.get(address).output.data.toString());
      });

      return output;
    } catch {
      throw new Error('Failed to resolve proxy addresses');
    }
  }

  private ilkToName(ilk: Address) {
    return (
      chunk(ilk.slice(2).split(''), 2)
        .map((ch) => String.fromCharCode(Number(`0x${ch.join('')}`)))
        .join('')
        // eslint-disable-next-line no-control-regex
        .replace(/(\x00)+$/, '')
    );
  }

  private async getContract<
    T extends INamedFunctionPredicates,
    U extends { [key in keyof T]: any },
  >(address: Address, predicates: T): Promise<{ functions: U; contract: DynamicContract }> {
    const functions = await this.abiService.parseFunctionsFromAddress(
      address,
      this.meta.chain,
      predicates,
    );

    return {
      functions: functions as U,
      contract: new DynamicContract(PROXY_REGISTRY),
    };
  }
}
