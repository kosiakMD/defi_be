const getEthTimestampPrice = (priceServiceEndpoint, timestamps): string => {
  return `${priceServiceEndpoint}?currencyId=1&chainId=1&addresses=0x0000000000000000000000000000000000000000&timestamps=${timestamps}`;
};

export default getEthTimestampPrice;