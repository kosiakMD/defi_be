import { CoingeckoRequestItemIds } from "../interfaces/coingecko.interface";

export function preparePricesCoingeckoId(data, input: CoingeckoRequestItemIds): CoingeckoRequestItemIds {
  let newData = {};
  for (const key in data) {
    if (input[key]?.address) {
      newData[input[key].address] = data[key]
    }
    else {
      newData[key] = data[key]
    }
  }
  return newData;
}