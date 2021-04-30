import { decimalsAmount, totalPrice } from '../../utils/utils';
import { CurrentPricesPayload } from '../dto/price.response.dto';
import { AccountTokenBalance, BalanceToken } from '../interfaces/balance.interfaces';

export function getUtilTokenPrice(tokens: BalanceToken[], prices: CurrentPricesPayload) {
  return tokens.map((token) =>
    Object.prototype.hasOwnProperty.call(prices, token.address)
      ? prices[`${token.address}`] === null
        ? { address: token.address, price: 0 }
        : { address: token.address, price: prices[`${token.address}`] }
      : { address: token.address, price: 0 },
  );
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
  chainId: number;
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
    },
  };
};
