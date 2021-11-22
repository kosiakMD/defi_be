export interface CurrentPricesPayload {
  [key: string]: number;
}

export class PriceResponseDto {
  prices: CurrentPricesPayload;
}
