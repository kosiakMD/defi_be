import { tokens, poolInfo } from './orca.interface';

export async function generateListPools(
  pools: { [key: string]: any },
  doubleDips: { [key: string]: any },
  aquafarms: { [key: string]: any },
  tokens: { [key: string]: any },
) {
  const listPools = [];

  for (const keyP in pools) {
    const poolInfo: Partial<poolInfo> = {};
    const p = pools[keyP];
    poolInfo.pool = p;
    if (aquafarms) {
      for (const keyAQ in aquafarms) {
        if (keyAQ === p.account) {
          poolInfo.aq = aquafarms[keyAQ];
        }
      }
    }
    if (doubleDips) {
      for (const keyDD in doubleDips) {
        if (keyDD === p.account) {
          poolInfo.dd = doubleDips[keyDD];
        }
      }
    }
    const poolTokens: Partial<tokens> = {};
    for (const keyT in tokens) {
      const t = tokens[keyT];
      if (keyT === p.tokenAName) {
        poolTokens.tokenA = t;
        poolTokens.tokenA.symbol = keyT;
      } else if (keyT === p.tokenBName) {
        poolTokens.tokenB = t;
        poolTokens.tokenB.symbol = keyT;
      } else if (p.poolTokenMint === t.mint) {
        poolTokens.tokenLp = t;
        if (poolInfo.aq) {
          poolTokens.tokenLp.mint = poolInfo.aq.farmTokenMint;
        }
        poolTokens.tokenLp.symbol = keyT;
      }
    }
    poolInfo.tokens = poolTokens;

    listPools.push(poolInfo);
  }

  return listPools;
}
