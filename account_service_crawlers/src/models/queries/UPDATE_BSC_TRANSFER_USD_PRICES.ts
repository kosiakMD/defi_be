const updateBscTransferUsdPrices = (values): string => {
  return `UPDATE bsc_transfers AS t SET tokenprice = c.tokenprice FROM (values ${values}) AS c(tokenAddress, tokenprice, blockTimestamp) WHERE (tokenAddress = c.tokenAddress AND blockTimestamp = c.blockTimestamp)`;
};

export default updateBscTransferUsdPrices;
