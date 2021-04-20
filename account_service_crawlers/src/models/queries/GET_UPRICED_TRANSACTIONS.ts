const getUnPricedTokens = (offset): string => {
  return `SELECT "tokenAddress" as tokenAddress, "blockTimestamp" as blockTimestamp FROM transactions WHERE tokenprice IS NULL OR ethprice IS NULL LIMIT 500 OFFSET ${offset};`;
};

export default getUnPricedTokens;
