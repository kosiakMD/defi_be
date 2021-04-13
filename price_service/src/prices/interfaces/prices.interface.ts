export interface PriceFormat {
  timestamps: number[];
  timestampMapper: TimestampMapper;
}

export interface TimestampMapper {
  [key: number]: number;
}
