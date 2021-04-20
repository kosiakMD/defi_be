const getLastTransactionId = (): string => {
  return `SELECT id FROM transactionseth ORDER BY id DESC LIMIT 1`;
};

export default getLastTransactionId;
