interface CurrencyList {
  [key: string]: number;
}

export class CurrencyListDto {
  quotes: CurrencyList;
}
