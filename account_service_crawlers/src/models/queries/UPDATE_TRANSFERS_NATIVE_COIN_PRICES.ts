const updateTransferNativeCoinPrices = (table, nativeAssetColumn, values): string => {
  return `UPDATE ${table} AS t SET ${nativeAssetColumn} = c.${nativeAssetColumn} FROM (values ${values}) AS c(tokenAddress, ${nativeAssetColumn}, blockTimestamp) WHERE (tokenAddress = c.tokenAddress AND blockTimestamp = c.blockTimestamp)`;
};

export default updateTransferNativeCoinPrices;
