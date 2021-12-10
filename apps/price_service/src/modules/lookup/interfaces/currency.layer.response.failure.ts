export interface CurrencyLayerResponseFailure {
  success: false;
  error: {
    code: number;
    info: string;
  };
}
