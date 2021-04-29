const getLastTransferId = (table): string => {
  return `SELECT id FROM ${table} ORDER BY id DESC LIMIT 1`;
};

export default getLastTransferId;
