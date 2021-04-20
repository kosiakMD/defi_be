const updateTokenEthPrices = (values): string => {
  return `UPDATE transactions AS t SET ethprice = c.ethprice FROM (values ${values}) AS c(tokenAddress, ethprice) WHERE tokenAddress = c.tokenAddress`;
};

export default updateTokenEthPrices;
