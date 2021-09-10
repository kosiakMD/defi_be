import { plainToClass } from 'class-transformer';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { replaceIncorrectTokenAddress } from 'src/utils/token';
import { Repository } from 'typeorm';
import Web3 from 'web3';

import { HttpException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { BLACKLISTED_TOKENS, ETH_BNB_ADDRESS } from '../common/constatnt';
import { Address } from '../common/interfaces';
import { ChainIdEnum } from 'src/common/enum';

import { Logger } from '../Logger/Logger.service';
import { AssetsEntity } from '../assets/entity/assets.entity';
import { BlacklistService } from '../blacklist/blacklist.service';
import { Web3Provider } from '../chain/web3.provider';
import { Covalent } from '../covalent/covalent.interface';
import { CovalentService } from '../covalent/covalent.service';
import { PriceService } from '../price/price.service';
import { getAbsoluteChainIds, getInternalChainId } from '../utils/chains';
import {
  decimalsAmount,
  excludeSecondArray,
  getUniqList,
  getUniqueAndToLowerCaseArrayData,
  totalPrice,
} from '../utils/utils';
import { isBnbAddress } from '../utils/web3';
import { AccountTokenBalanceDto, AllBalancesDto } from './balance.dto';
import { getNoDbTokensPricesWithLp, mapTokenBalances } from './balance_util/balance.util';
import {
  AccountBalance,
  AccountTokenBalance,
  BalanceToken,
  BalancesResponse,
  DbTokenPrice,
  ErrorMessage,
  TokenBalance,
  TokenPrices,
  TokenPricesV2,
  TokenRow,
  Web3TokenBalance,
} from './interfaces/balance.interfaces';
import { DbService } from './repository/db.service';
import {
  NO_DB_ARBITRUM_TOKENS,
  NO_DB_AVAX_TOKENS,
  NO_DB_BNB_TOKENS,
  NO_DB_ETH_TOKENS,
  NO_DB_FTM_TOKENS,
  NO_DB_POLYGON_TOKENS,
} from './tokens/tokens';

// TODO refactor from 1 class to Factory / Abstract
@Injectable()
export class BalanceService {
  private readonly instanceChainProviderEth: Web3;
  private readonly instanceChainProviderBsc: Web3;

  constructor(
    private readonly dbService: DbService,
    private readonly chainProvider: Web3Provider,
    private readonly priceService: PriceService,
    private readonly covalentService: CovalentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectRepository(AssetsEntity)
    private readonly assentsRepository: Repository<AssetsEntity>,
    private readonly blacklistService: BlacklistService,
  ) {
    this.instanceChainProviderEth = this.chainProvider.instanceEth();
    this.instanceChainProviderBsc = this.chainProvider.instanceBsc();
  }

  private getPricesAndBalances(
    tokensAddresses,
    chainId: ChainIdEnum,
    accountsArray,
  ): Promise<any[]> {
    return Promise.all([
      this.priceService.getTokenPricesWithLp(tokensAddresses, chainId, 1),
      Promise.all(
        accountsArray.map(async (account) => ({
          account,
          amount:
            chainId === ChainIdEnum.eth
              ? await this.instanceChainProviderEth.eth.getBalance(account)
              : await this.instanceChainProviderBsc.eth.getBalance(account),
        })),
      ),
    ]);
  }

  private async getArrayOfTokenBalances(
    ethBalances: Web3TokenBalance[],
    priceArray: DbTokenPrice[],
    balanceArray: BalanceToken[],
    chain: ChainIdEnum,
    mapNoDbTokenBalances?: Map<string, TokenPrices[]>,
  ): Promise<AccountTokenBalance[]> {
    const etherBalances: AccountTokenBalance[] = [];
    for (const balance of ethBalances) {
      const noDbTokenBalances = mapNoDbTokenBalances
        ? mapNoDbTokenBalances.get(balance.account)
        : [];
      for (let i = 0; i < balanceArray.length; i++) {
        const price = priceArray.find((item) => item.address === balanceArray[i].address);
        if (isBnbAddress(balanceArray[i].address)) {
          const temporary = mapTokenBalances({
            ...balance,
            token: balanceArray[i],
            chainId: chain,
            price: price.price,
          });
          etherBalances.push(temporary);
          continue;
        }

        const amountObj = noDbTokenBalances.find((b) => b[balanceArray[i].address]);
        if (amountObj && +amountObj[balanceArray[i].address] !== 0) {
          etherBalances.push(
            mapTokenBalances({
              account: balance.account,
              amount: amountObj[balanceArray[i].address].toString(),
              token: balanceArray[i],
              chainId: chain,
              price: price.price,
            }),
          );
        }
      }
    }
    return etherBalances;
  }

  private mapCovalentResponse(allBalances: AllBalancesDto[]): BalancesResponse {
    // TODO we can get isLp info from db tokens, or from price service(as i do bellow)
    // const assets = await this.assentsRepository.find({
    //   address: In(balances.map((token) => token.contract_address)),
    // });

    const balancesByAccount: Map<Address, AccountBalance> = new Map();

    allBalances.forEach(({ address, balances }) => {
      const tokens: AccountTokenBalance[] = [];
      const errors = [];

      balances.forEach((balance) => {
        balance.items
        .filter(
          // TODO: Hotfix. Remove or rewrite this filtration
          (token) => !BLACKLISTED_TOKENS.includes(token.contract_address),
        )
        .forEach((token) => {
          const decimalsAmount = +token.balance / 10 ** token.contract_decimals;
          const tokenPriceUSD = token.quote_rate ? token.quote_rate : null;
          const totalPriceUSD = tokenPriceUSD * decimalsAmount;
          const tokenAddress = replaceIncorrectTokenAddress(
            token.contract_address,
            getInternalChainId(balance.chain),
          );

          if (balance.error) {
            errors.push(balance.error);
          }

          tokens.push(
            plainToClass(AccountTokenBalanceDto, {
              account: address,
              amount: token.balance,
              decimalsAmount,
              tokenPriceUSD,
              totalPriceUSD: totalPriceUSD || null,
              token: {
                chainId: getInternalChainId(balance.chain),
                decimals: token.contract_decimals,
                symbol: token.contract_ticker_symbol,
                name: token.contract_name,
                address: tokenAddress,
                totalSupply: 0,
                isLp: false,
                // isLp: assets.find((asset) => asset.address === token.contract_address)?.isLp || false,
              },
            }),
          );
        });
      });

      balancesByAccount.set(address, {
        account: address,
        totalUsd: this.calculateTotalUsd(tokens),
        tokens,
        errors,
      });
    });

    return Object.fromEntries(balancesByAccount);
  }

  private accountBalanceFilter(account: Address, balance: AccountTokenBalance): boolean {
    return balance.account === account;
  }

  public async getBalanceFromCovalent(
    addresses: Address[],
    chains?: ChainIdEnum[],
  ): Promise<BalancesResponse> {
    const chainsToHandle = getAbsoluteChainIds(getUniqList(chains));
    const addressesToHandle = getUniqueAndToLowerCaseArrayData(addresses);

    const allBalances: AllBalancesDto[] = [];

    const blacklistedAddresses: string[] = await this.blacklistService.filterIsBlacklisted(
      addresses,
    );

    addresses = excludeSecondArray(addresses, blacklistedAddresses);
    if (addresses.length === 0) {
      return {};
    }

    const promises = [];

    addressesToHandle.forEach((address, addressIndex) => {
      allBalances.push({
        address: address,
        balances: [],
      });
      chainsToHandle.forEach((chain) => {
        const promise = this.covalentService.getBalances(address, chain);
        promises.push(promise);
        allBalances[addressIndex].balances.push({
          chain: chain,
          items: [],
          error: null,
          status: null,
        });
      });
    });

    const results = await Promise.allSettled<Covalent.Balance>(promises);

    let index = 0;
    allBalances.forEach(({ balances }) => {
      balances.forEach((balance) => {
        const result = results[index];
        if (result.status === 'fulfilled') {
          balance.items = result.value.items;
          balance.status = result.status;
        } else {
          balance.error = new HttpException(
            result.reason?.response?.data?.error_message,
            result.reason?.response?.status,
          );
          balance.status = result.status;
        }
        index++;
      });
    });

    return this.mapCovalentResponse(allBalances);
  }

  public async getBalanceDataFromDb(
    accounts: Address[],
    chains?: ChainIdEnum[],
  ): Promise<BalancesResponse> {
    const allBalances: Map<Address, AccountBalance> = new Map();
    const blacklistedAddresses: string[] = await this.blacklistService.filterIsBlacklisted(
      accounts,
    );

    accounts = accounts.filter((a) => !blacklistedAddresses.find((b) => a === b));
    if (accounts.length === 0) {
      return Object.fromEntries(allBalances);
    }

    accounts.forEach((account) => {
      allBalances.set(account, {
        account: account,
        totalUsd: 0,
        tokens: [],
        errors: [],
      });
    });

    const scanHandlers = [];

    chains?.forEach((chain) => {
      scanHandlers.push(this.getBalances(accounts, chain));
    });

    const balancesByAccounts = await Promise.all(scanHandlers);

    balancesByAccounts.forEach((balancesByAccount) => {
      Object.keys(balancesByAccount).forEach((accountAddress) => {
        allBalances.set(accountAddress, {
          account: accountAddress,
          totalUsd:
            allBalances.get(accountAddress).totalUsd + balancesByAccount[accountAddress].totalUsd,
          tokens: [
            ...allBalances.get(accountAddress).tokens,
            ...balancesByAccount[accountAddress].tokens,
          ],
          errors: [
            ...allBalances.get(accountAddress).errors,
            ...balancesByAccount[accountAddress].errors,
          ],
        });
      });
    });

    return Object.fromEntries(allBalances);
  }

  public async getBalances(accounts: Address[], chainId: ChainIdEnum): Promise<BalancesResponse> {
    const errors: ErrorMessage[] = [];
    const accountsArray = getUniqueAndToLowerCaseArrayData(accounts);
    const noDbTokens: Record<ChainIdEnum, BalanceToken[]> = {
      [ChainIdEnum.arbitrum]: NO_DB_ARBITRUM_TOKENS,
      [ChainIdEnum.avax]: NO_DB_AVAX_TOKENS,
      [ChainIdEnum.bsc]: NO_DB_BNB_TOKENS,
      [ChainIdEnum.eth]: NO_DB_ETH_TOKENS,
      [ChainIdEnum.ftm]: NO_DB_FTM_TOKENS,
      [ChainIdEnum.polygon]: NO_DB_POLYGON_TOKENS,
    };

    const tokenRows = await this.dbService.loadErc20Balances(accountsArray, chainId);

    tokenRows.forEach((t) => {
      t.address = t.address.toLowerCase();
      t.tokenAddress = t.tokenAddress.toLowerCase();
    });

    const tokensAddresses = tokenRows.map(({ tokenAddress }) => tokenAddress.toLowerCase());

    if (chainId === ChainIdEnum.eth) {
      if (!tokensAddresses.find((tokensAddress) => tokensAddress === ETH_BNB_ADDRESS)) {
        tokensAddresses.push(ETH_BNB_ADDRESS);
      }
    }

    const [tokenPrices, balances] = await this.getPricesAndBalances(
      tokensAddresses,
      chainId,
      accountsArray,
    );

    const priceArray = getNoDbTokensPricesWithLp(noDbTokens[chainId], tokenPrices.prices);

    const tokenBalances = await this.getArrayOfTokenBalances(
      balances,
      priceArray,
      noDbTokens[chainId],
      chainId,
    );

    const erc20Balances = tokenRows.map(this.mapErc20Balance(tokenPrices.prices, chainId));

    return accountsArray.reduce((response, account) => {
      const filteredTokenBalances = tokenBalances.filter((balance) =>
        this.accountBalanceFilter(account, balance),
      );
      const erc20 = erc20Balances.filter((balance) => this.accountBalanceFilter(account, balance));
      const tokens = filteredTokenBalances.concat(erc20).map((t) => {
        return {
          ...t,
          account: account,
        };
      });
      const totalUsd = this.calculateTotalUsd(tokens);

      return {
        ...response,
        [account]: {
          account,
          totalUsd,
          tokens,
          errors,
        },
      };
    }, {});
  }

  private calculateTotalUsd = (tokens: TokenBalance[]): number =>
    tokens.reduce((total, { totalPriceUSD }) => total + (totalPriceUSD || 0), 0);

  private mapErc20Balance = (
    prices: TokenPricesV2,
    chainId: ChainIdEnum,
  ): ((row: TokenRow) => AccountTokenBalanceDto) => ({
    address,
    amount,
    tokenAddress,
    tokenName,
    tokenSymbol,
    tokenDecimals,
    tokenTotalSupply,
    isLp,
  }): AccountTokenBalanceDto =>
    plainToClass(AccountTokenBalanceDto, {
      account: address,
      amount,
      decimalsAmount: decimalsAmount(amount, tokenDecimals ? tokenDecimals : 18),
      tokenPriceUSD: prices[tokenAddress]?.price || 0,
      totalPriceUSD: prices[tokenAddress]?.price
        ? totalPrice(amount, prices[tokenAddress]?.price, tokenDecimals ? tokenDecimals : 18)
        : 0,
      token: {
        chainId: chainId,
        address: tokenAddress,
        name: tokenName || null,
        symbol: tokenSymbol || null,
        decimals: tokenDecimals ? parseInt(tokenDecimals) : 18,
        totalSupply: +tokenTotalSupply || 0,
        isLp: isLp,
      },
    });
}
