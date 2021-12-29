export function calcTokenPrice(
  reserves: number[],  
  index: number,
  price: string,
): number {
  const coef = index ? (reserves[0] / reserves[1]) : (reserves[1] / reserves[0]);
  return coef * Number(price);
}
