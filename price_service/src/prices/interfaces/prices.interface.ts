export interface CurrentPrice {
  [key: string]: string;
}

export interface HistoricalPrice {
  [key: string]: {
    [key: string]: string;
  };
}

export interface PriceFormat {
  timestamps: number[];
  timestampMapper: TimestampMapper;
}

export interface TimestampMapper {
  [key: number]: number;
}
