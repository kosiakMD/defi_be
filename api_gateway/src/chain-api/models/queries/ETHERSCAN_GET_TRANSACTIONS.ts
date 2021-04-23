const getEtherscanTransaction = (etherscanUrl, etherscanKey, address): string => {
  return `${etherscanUrl}?module=account&action=tokentx&address=${address}&startblock=0&endblock=999999999&sort=asc&apikey=${etherscanKey}`;
};

export default getEtherscanTransaction;
