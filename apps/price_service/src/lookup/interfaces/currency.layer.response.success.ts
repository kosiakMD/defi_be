export interface CurrencyLayerResponseSuccess {
  success: true;
  terms: 'https://currencylayer.com/terms';
  privacy: 'https://currencylayer.com/privacy';
  timestamp: number;
  source: 'USD';
  quotes: {
    [key: string]: number;
  };
}
