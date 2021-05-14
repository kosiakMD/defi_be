import { Injectable } from '@nestjs/common';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { Web3Provider } from '../../chain/web3.provider';
import { PriceService } from '../../price/price.service';
import {
  abi,
  CHAIN_ID_BSC,
  CHAIN_ID_ETH,
  ETH_BNB_ADDRESS,
  EXCLUDE_TRANSFER_TOKEN_ADDRESSES,
  toDecimals,
  totalPrice,
  transferTokenAddressNotIn,
  WETH_ADDRESS,
} from '../../utils/utils';
import { getUtilTokenPrice, mapTokenBalances } from '../balance_util/balance.util';
import { CurrentPricesPayload } from '../dto/price.response.dto';
import {
  AccountTokenBalance,
  BalancesResponse,
  TokenBalance,
} from '../interfaces/balance.interfaces';
import { Transfers } from '../interfaces/etherscan.interfaces';
import { NO_SCAN_BNB_TOKENS, NO_SCAN_ETH_TOKENS } from '../tokens/tokens';
import { EtherscanApi } from './etherscan.api';

@Injectable()
export class EtherscanService {
  private instanceEthProvider: Web3;
  private instanceBscProvider: Web3;

  constructor(
    private etherscanApi: EtherscanApi,
    private priceService: PriceService,
    private web3Provider: Web3Provider,
  ) {
    this.instanceBscProvider = web3Provider.instanceBsc();
    this.instanceEthProvider = web3Provider.instanceEth();
  }

  public async getBalanceDataFromChains(
    accounts: string,
    chains: number,
  ): Promise<BalancesResponse> {
    const allBalances: BalancesResponse = {};
    if (!accounts) {
      return allBalances;
    }
    const lowerCaseAccounts = accounts.split(',').map((account) => account.toLowerCase());

    const [ethBalances, bscBalances] = await Promise.all([
      +chains !== CHAIN_ID_BSC ? this.getBalances(lowerCaseAccounts, CHAIN_ID_ETH) : null,
      +chains !== CHAIN_ID_ETH ? this.getBalances(lowerCaseAccounts, CHAIN_ID_BSC) : null,
    ]);

    if (ethBalances && bscBalances) {
      Object.keys(ethBalances).map((key) => {
        allBalances[key] = {
          totalUsd: ethBalances[key].totalUsd + bscBalances[key].totalUsd,
          tokens: [...ethBalances[key].tokens, ...bscBalances[key].tokens],
        };
      });

      return allBalances;
    }
    return ethBalances || bscBalances;
  }

  private calculateTotalUsd = (tokens: TokenBalance[]): number =>
    tokens.reduce((total, { totalPriceUSD }) => total + (totalPriceUSD || 0), 0);

  async getBalances(addresses: string[], chain: number): Promise<any> {
    const transfersAll: Transfers = {};
    await Promise.all(
      addresses.map(async (a) => {
        transfersAll[a] = await this.etherscanApi.getEthTransfers(a, chain);
      }),
    );
    const allNonLpTokens: string[] = await this.priceService.getNonLpTokens();
    const allBalances: BalancesResponse = {};
    for (const address of Object.keys(transfersAll)) {
      if (allBalances[address] === undefined) {
        allBalances[address] = {
          totalUsd: 0,
          tokens: [],
        };
      }

      const addressTokens = transfersAll[address].map((transfer) =>
        transfer.contractAddress.toLowerCase(),
      );
      const filteredAddressTokens = addressTokens.filter((token) => allNonLpTokens.indexOf(token) >= 0 )
      const uniqueTokenAddresses = [...new Set(filteredAddressTokens)];
      const priceResponseDto = await this.priceService.getTokenPrices(uniqueTokenAddresses, chain);
      const excludeAddresses = Array.of(...EXCLUDE_TRANSFER_TOKEN_ADDRESSES);
      excludeAddresses.push(WETH_ADDRESS);

      transfersAll[address]
        .filter(
          (transfer) => transferTokenAddressNotIn(transfer.contractAddress, excludeAddresses)
          &&  allNonLpTokens.indexOf( transfer.contractAddress ) >= 0,
        )
        .map((transfer) => {
          const amountToAdd: number = transfer.from === address ? -transfer.value : transfer.value;

          const decimalAmountToAdd: number = toDecimals(amountToAdd, transfer.tokenDecimal);
          const existedAccountBalance: AccountTokenBalance = allBalances[address].tokens.find(
            (tok) => tok.token.address === transfer.contractAddress,
          );
          if (existedAccountBalance === undefined) {
            const tokenBalance: AccountTokenBalance = {
              account: address,
              amount: amountToAdd.toString(),
              decimalsAmount: decimalAmountToAdd,
              tokenPriceUSD: priceResponseDto.prices[transfer.contractAddress],
              totalPriceUSD: totalPrice(
                amountToAdd.toString(),
                priceResponseDto.prices[transfer.contractAddress],
                transfer.tokenDecimal,
              ),
              token: {
                chainId: chain,
                name: transfer.tokenName,
                address: transfer.contractAddress,
                decimals: transfer.tokenDecimal,
                symbol: transfer.tokenSymbol,
              },
            };
            allBalances[address].tokens.push(tokenBalance);
          } else {
            existedAccountBalance.amount = (
              Number(existedAccountBalance.amount) + Number(amountToAdd)
            ).toString();
            existedAccountBalance.decimalsAmount =
              existedAccountBalance.decimalsAmount + decimalAmountToAdd;
            existedAccountBalance.totalPriceUSD = totalPrice(
              existedAccountBalance.amount,
              existedAccountBalance.tokenPriceUSD,
              transfer.tokenDecimal,
            );
          }
        });

      const tokenBalanceArray = await this.getArrayOfTokenBalances(
        address,
        priceResponseDto.prices,
        chain,
      );
      tokenBalanceArray.forEach((item) => allBalances[address].tokens.push(item));
      allBalances[address].totalUsd = this.calculateTotalUsd(allBalances[address].tokens);
    }
    return allBalances;
  }

  private async getArrayOfTokenBalances(
    address: string,
    currentPrice: CurrentPricesPayload,
    chain: number,
  ): Promise<AccountTokenBalance[]> {
    const [provider, balanceArray] =
      chain === CHAIN_ID_ETH
        ? [this.instanceEthProvider, NO_SCAN_ETH_TOKENS]
        : [this.instanceBscProvider, NO_SCAN_BNB_TOKENS];

    const etherBalances = [];
    for (let i = 0; i < balanceArray.length; i++) {
      const priceArray = await getUtilTokenPrice(balanceArray, currentPrice);
      const tokenInst = await new provider.eth.Contract(abi as AbiItem[], balanceArray[i].address);

      const tokenAmount =
        balanceArray[i].address === ETH_BNB_ADDRESS
          ? await provider.eth.getBalance(address)
          : await tokenInst.methods.balanceOf(address).call();

      const price = priceArray.find((item) => item.address === balanceArray[i].address);
      if (Number(tokenAmount) !== 0) {
        etherBalances.push(
          mapTokenBalances({
            account: address,
            amount: tokenAmount,
            token: balanceArray[i],
            chainId: chain,
            price: price.price,
          }),
        );
      }
    }
    return etherBalances;
  }
}
