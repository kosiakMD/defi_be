export function decimalConverter(decimals: number) {
  return (number: number): number => Number(number) / 10 ** decimals;
}
