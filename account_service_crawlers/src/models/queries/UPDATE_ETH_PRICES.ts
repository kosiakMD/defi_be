const updateEthTransactionPrices = (values): string => {
  return `UPDATE transactionseth AS t SET ethprice = c.ethprice FROM (values ${values}) AS c(hash, ethprice) WHERE t.hash = c.hash`;
};

export default updateEthTransactionPrices;
