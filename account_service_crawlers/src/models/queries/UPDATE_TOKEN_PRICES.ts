const updateTokenPrices = (values): string => {
  return `UPDATE transactions AS t SET tokenprice = c.tokenprice, ethprice = c.ethprice FROM (values ${values}) AS c(tokenAddress, tokenprice, ethprice) WHERE t.tokenAddress = c.tokenAddress`;
};

export default updateTokenPrices;
