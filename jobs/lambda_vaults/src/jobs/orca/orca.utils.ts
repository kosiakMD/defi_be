import { tokens, poolInfo } from './orca.interface';

function mappingTokens(tokens: { [key: string]: any }) {
  const tokensMap = new Map(
    Object.entries(tokens).map(([key, value]) => {
      const token = value;
      token.symbol = key;

      return [key, token];
    }),
  );

  const tokensByMint = new Map(Array.from(tokensMap).map(([, value]) => [value.mint, value]));

  return {
    tokensMap,
    tokensByMint,
  };
}

export async function generateListPools(
  pools: { [key: string]: any },
  doubleDips: { [key: string]: any },
  aquafarms: { [key: string]: any },
  tokens: { [key: string]: any },
) {
  const listPools = [];
  const { tokensMap, tokensByMint } = mappingTokens(tokens);

  for (const keyP in pools) {
    const poolInfo: Partial<poolInfo> = {};
    const p = pools[keyP];
    poolInfo.pool = p;
    const aq = aquafarms ? aquafarms[p.account] : undefined;
    if (aq) {
      poolInfo.aq = aq;
      const dd = doubleDips ? doubleDips[p.account] : undefined;
      if (dd) {
        poolInfo.dd = dd;
      }
      const poolTokens: Partial<tokens> = {};

      poolTokens.tokenA = tokensMap.get(p.tokenAName);
      poolTokens.tokenB = tokensMap.get(p.tokenBName);
      poolTokens.tokenLp = tokensByMint.get(p.poolTokenMint);

      if (poolTokens.tokenLp) {
        if (poolInfo.aq) {
          poolTokens.tokenLp.mint = poolInfo.aq.farmTokenMint;
        }
      }
      poolInfo.tokens = poolTokens;

      listPools.push(poolInfo);
    }
  }

  return listPools;
}
export async function generateListFarms(
  pools: { [key: string]: any },
  doubleDips: { [key: string]: any },
  aquafarms: { [key: string]: any },
  tokens: { [key: string]: any },
) {
  const listFarms = [];
  const { tokensMap, tokensByMint } = mappingTokens(tokens);

  for (const keyP in pools) {
    const poolInfo: Partial<poolInfo> = {};
    const p = pools[keyP];
    poolInfo.pool = p;
    const dd = doubleDips ? doubleDips[p.account] : undefined;
    if (dd) {
      const aq = aquafarms ? doubleDips[p.account] : undefined;
      if (aq) {
        poolInfo.aq = aquafarms[p.account];
      }
      poolInfo.dd = doubleDips[p.account];
      const poolTokens: Partial<tokens> = {};
      poolTokens.tokenA = tokensMap.get(p.tokenAName);
      poolTokens.tokenB = tokensMap.get(p.tokenBName);
      poolTokens.tokenLp = tokensByMint.get(p.poolTokenMint);

      if (poolTokens.tokenLp) {
        if (poolInfo.aq) {
          poolTokens.tokenLp.mint = poolInfo.aq.farmTokenMint;
        }
      }

      poolInfo.tokens = poolTokens;

      listFarms.push(poolInfo);
    }
  }

  return listFarms;
}
