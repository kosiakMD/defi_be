import { LiquidityPoolsEntity } from '../../store/entities/liquiditypools.entity';

export const BUSD_BNB_PAIR_ADDRESS_NEW = '0x58f876857a02d6762e0101bb5c46a8c1ed44dc16';
export const USDT_BNB_PAIR_ADDRESS_NEW = '0x16b9a82891338f9ba80e2d6970fdda79d1eb0dae';
export const WBNB_TOKEN_ADDRESS = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';

export function deriveBNBPrice(pools: LiquidityPoolsEntity[]): number {
  const BUSD_BNB_POOL = pools.find((p) => p.address === BUSD_BNB_PAIR_ADDRESS_NEW);
  const USDT_BNB_POOL = pools.find((p) => p.address === USDT_BNB_PAIR_ADDRESS_NEW);

  const WBNB_BUSD = BUSD_BNB_POOL.poolTokens.find((t) => t.id === WBNB_TOKEN_ADDRESS);
  const BUSD_WBNB = BUSD_BNB_POOL.poolTokens.find((t) => t.id !== WBNB_TOKEN_ADDRESS);
  const WBNB_USDT = USDT_BNB_POOL.poolTokens.find((t) => t.id === WBNB_TOKEN_ADDRESS);
  const USDT_WBNB = USDT_BNB_POOL.poolTokens.find((t) => t.id !== WBNB_TOKEN_ADDRESS);

  const totalLiquidityBNB = Number(WBNB_BUSD.reserve) + Number(WBNB_USDT.reserve);

  const busdWeight = WBNB_BUSD.reserve / totalLiquidityBNB;
  const usdtWeight = WBNB_USDT.reserve / totalLiquidityBNB;

  const bnbPriceBusd = BUSD_WBNB.reserve / WBNB_BUSD.reserve;
  const usdtPriceBusd = USDT_WBNB.reserve / WBNB_USDT.reserve;

  return bnbPriceBusd * busdWeight + usdtPriceBusd * usdtWeight;
}

export function deriveBNBPerToken(tokenAddress: string, pools: LiquidityPoolsEntity[]): number {
  if (tokenAddress === WBNB_TOKEN_ADDRESS) {
    return 1;
  }
  let bnbPerToken = 0;
  pools.map((p) => {
    const poolTokens = p.poolTokens;
    if (poolTokens[0].id === tokenAddress && poolTokens[1].id === WBNB_TOKEN_ADDRESS) {
      bnbPerToken = poolTokens[1].reserve / poolTokens[0].reserve;
    }
    if (poolTokens[0].id === WBNB_TOKEN_ADDRESS && poolTokens[1].id === tokenAddress) {
      bnbPerToken = poolTokens[0].reserve / poolTokens[1].reserve;
    }
  });
  return bnbPerToken;
}
