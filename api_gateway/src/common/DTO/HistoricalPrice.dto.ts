import { HistoricalPrice } from '../../prices/prices.interface';

export default class HistoricalPriceDto implements HistoricalPrice {
  addresses: string;

  prices: {
    [index: number]: number;
  }[];
}
