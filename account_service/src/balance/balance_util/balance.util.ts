import { decimalsAmount, totalPrice } from '../../utils/utils';
import { CurrentPricesPayload } from '../dto/price.response.dto';
import { AccountTokenBalance, BalanceToken, DbTokenPrice } from '../interfaces/balance.interfaces';
import { ChainIdEnum } from 'src/common/enum';

export function getUtilTokenPrice(
  tokens: BalanceToken[],
  prices: CurrentPricesPayload,
): DbTokenPrice[] {
  return tokens.map((token) =>
    Object.prototype.hasOwnProperty.call(prices, token.address)
      ? prices[`${token.address}`] === null
        ? { address: token.address, price: 0 }
        : { address: token.address, price: prices[`${token.address}`] }
      : { address: token.address, price: 0 },
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
