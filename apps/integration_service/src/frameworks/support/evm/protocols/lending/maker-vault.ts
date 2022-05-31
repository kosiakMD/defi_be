import Maker from '@makerdao/dai';
import { McdPlugin } from '@makerdao/dai-plugin-mcd';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { FailedCacheDataException } from '../../../exceptions';
import { IProtocolMeta } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  IBorrowTokenMinimal as IBorrowTokenMinimalBase,
  IBorrowTokenOpportunity,
  IBorrowTokenUserEntity,
} from '../../../interfaces/tokens-borrowed.interface';
import { ERC20Token } from '../../../interfaces/tokens-common.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens-supplied.interface';
import { AbiService } from '../../abi-module/abi-service';
import { EVMCore } from '../../evmcore';
import {
  GraphQLResponse,
  PoolInterface,
  PoolsQuery,
  PoolsQueryInterface,
} from '../../subgraphs/maker-dAOSubgraph';

type IBorrowTokenMinimal = IBorrowTokenMinimalBase<{ rate: number }>;

export type ILendingFeatureEntryMinimal = BaseWithTokens<
  ISupplyTokenMinimal,
  void,
  IBorrowTokenMinimal,
  { name: string }
>;
export type ILendingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  void,
  IBorrowTokenOpportunity,
  { name: string }
>;
export type ILendingFeatureUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry,
  void,
  IBorrowTokenUserEntity,
  { name: string }
> & { debtRatio: number };

interface MakerDAOVault {
  collateralAmount: string; // amount of collateral tokens
  collateralValue: string; // value in USD, using current price feed values
  debtValue: string; // amount of Dai debt
  collateralizationRatio: string; // collateralValue / debt
  liquidationPrice: string; // vault becomes unsafe at this price
  isSafe: boolean;
}

interface Vault {
  id: number;
  ilk: string; // maker dao vault name
  supplyAmount: number;
  borrowAmount: number;
  debtRatio: number;
}

interface MakerDAOCdpId {
  id: number;
  ilk: string;
}

export interface MakerVaultInterface extends IProtocolMeta {
  context: {
    subgraph: string;
  };
}

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
  protected formatBorrowApy(borrow: IBorrowTokenMinimal) {
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

    const maker = await Maker.create('http', {
      plugins: [McdPlugin],
      url: this.configService.get('ETHEREUM_URL'),
    });

    const manager = maker.service('mcd:cdpManager');

    const rawResults = await Promise.all(
      addresses.map(async (address) => {
        const positions = [];
        const proxyAddress = await maker.service('proxy').getProxyAddress(address);
        if (!proxyAddress) return { address, positions };
        const data: MakerDAOCdpId[] = await manager.getCdpIds(proxyAddress ?? address);

        const vaults = await this.mapCdpIdsToVaults(data, manager);

        vaults.forEach((vault) => {
          const pool = poolsByIlk.get(vault.ilk);

          // Filter out old/empty vaults
          if (!vault.supplyAmount && !vault.borrowAmount) return;

          positions.push({
            ...pool,
            debtRatio: vault.debtRatio,
            supply: {
              ...pool.supply,
              amount: vault.supplyAmount,
              value: vault.supplyAmount * pool.supply.token.price,
            },
            borrow: {
              ...pool.borrow,
              amount: vault.borrowAmount,
              value: vault.borrowAmount * pool.borrow.token.price,
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

  private async mapCdpIdsToVaults(cdpIds: MakerDAOCdpId[], manager: any): Promise<Vault[]> {
    const vaults: MakerDAOVault[] = await Promise.all(cdpIds.map((d) => manager.getCdp(d.id)));
    return vaults.map(
      (vault, idx): Vault => ({
        id: cdpIds[idx].id,
        ilk: cdpIds[idx].ilk,
        supplyAmount: parseFloat(vault.collateralAmount.toString()), // amount of collateral tokens
        borrowAmount: parseFloat(vault.debtValue.toString()), // amount of Dai debt
        debtRatio: parseFloat(vault.collateralizationRatio.toString()), // collateralValue / debt
      }),
    );
  }
}
