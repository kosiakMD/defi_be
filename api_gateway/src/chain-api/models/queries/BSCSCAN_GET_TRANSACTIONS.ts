const getBscscanTransaction = (bscscanUrl, bscscanKey, address): string => {
  return `${bscscanUrl}?module=account&action=txlist&address=${address}&startblock=1&endblock=99999999&sort=asc&apikey=${bscscanKey}`

};

export default getBscscanTransaction;
