const getUnPricedTokens = (offset, nativeAssetColumn, startTimestamp): string => {
  return `SELECT "tokenAddress" as tokenAddress, "blockTimestamp" as blockTimestamp FROM transactions WHERE (tokenprice IS NULL OR ${nativeAssetColumn} IS NULL) AND ("blockTimestamp" > '${startTimestamp}') LIMIT 500 OFFSET ${offset};`;
};

export default getUnPricedTokens;
