const getLastTransactionId = (): string => {
  return `SELECT id FROM transactions ORDER BY id DESC LIMIT 1`;
};

export default getLastTransactionId;
