const getUnPricedEthTransactions = (offset): string => {
  return `SELECT * FROM transactionseth WHERE ethprice IS NULL LIMIT 500 OFFSET ${offset};`;
};

export default getUnPricedEthTransactions;
