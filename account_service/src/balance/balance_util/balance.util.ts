import { plainToClass } from 'class-transformer';

import { ChainIdEnum } from 'src/common/enum';

import { NoDbTokenPricesDto } from '../../price/price.dto';
import { CurrentPricesPayloadNew } from '../../price/price.interfaces';
import { decimalsAmount, totalPrice } from '../../utils/utils';
import { CurrentPricesPayload } from '../dto/price.response.dto';
import { AccountTokenBalance, BalanceToken } from '../interfaces/balance.interfaces';

export function getUtilTokenPrice(
  tokens: BalanceToken[],
  prices: CurrentPricesPayload,
): NoDbTokenPricesDto[] {
  return tokens.map((token) =>
    Object.prototype.hasOwnProperty.call(prices, token.address)
      ? prices[`${token.address}`] === null
        ? plainToClass(NoDbTokenPricesDto, { address: token.address, price: null })
        : plainToClass(NoDbTokenPricesDto, {
            address: token.address,
            price: prices[`${token.address}`],
          })
      : plainToClass(NoDbTokenPricesDto, { address: token.address, price: null }),
  );
}

export function getNoDbTokensPricesWithLp(
  tokens: BalanceToken[],
  prices: CurrentPricesPayloadNew,
): NoDbTokenPricesDto[] {
  return tokens.map((token) =>
    Object.prototype.hasOwnProperty.call(prices, token.address)
      ? prices[token.address].price === null
        ? plainToClass(NoDbTokenPricesDto, { address: token.address, price: null })
        : plainToClass(NoDbTokenPricesDto, {
            address: token.address,
            price: prices[token.address].price,
          })
      : plainToClass(NoDbTokenPricesDto, { address: token.address, price: null }),
  );
}

export function changeTokenArray(fromArray: BalanceToken[], toArray: string[]): void {
  fromArray.forEach((token) => toArray.push(token.address));
}

export const mapTokenBalances = ({
  account,
  amount,
  token,
  chainId,
  price,
}: {
  account: string;
  amount: string;
  token: BalanceToken;
  chainId: ChainIdEnum;
  price?: number;
}): AccountTokenBalance => {
  return {
    amount,
    account,
    decimalsAmount: decimalsAmount(amount, token.decimals),
    tokenPriceUSD: price,
    totalPriceUSD: totalPrice(amount, price, token.decimals),
    token: {
      chainId: chainId,
      decimals: token.decimals,
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      isLp: token.isLp,
    },
  };
};
