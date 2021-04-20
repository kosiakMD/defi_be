const updateTokenUsdPrices = (values): string => {
  return `UPDATE transactions AS t SET tokenprice = c.tokenprice FROM (values ${values}) AS c(tokenAddress, tokenprice) WHERE tokenAddress = c.tokenAddress`;
};

export default updateTokenUsdPrices;
