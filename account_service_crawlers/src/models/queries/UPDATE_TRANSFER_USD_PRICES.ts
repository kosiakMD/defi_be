const updateTransferUsdPrices = (table, values): string => {
  return `UPDATE ${table} AS t SET tokenprice = c.tokenprice FROM (values ${values}) AS c(tokenAddress, tokenprice, blockTimestamp) WHERE (tokenAddress = c.tokenAddress AND blockTimestamp = c.blockTimestamp)`;
};

export default updateTransferUsdPrices;
