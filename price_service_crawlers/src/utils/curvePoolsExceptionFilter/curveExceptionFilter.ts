import exceptions from './exceptions';

export default function getEtalonTokenOrNull(pool) {
  const exception = exceptions.find((exception) => exception.id === pool.id);

  if (!exception) return null;

  switch (exception.type) {
    case 'BTC':
      return '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';
    case 'ETH':
      return '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    default:
      return null;
  }
}
