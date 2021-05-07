const getUnPricedTokens = (tableName, nativeAssetColumn, startTimestamp): string => {
  return `SELECT "tokenAddress" as tokenAddress, "blockTimestamp" as blockTimestamp FROM ${tableName} WHERE (tokenprice IS NULL OR ${nativeAssetColumn} IS NULL) AND ("blockTimestamp" > '${startTimestamp}') LIMIT 500;`;
};

export default getUnPricedTokens;
