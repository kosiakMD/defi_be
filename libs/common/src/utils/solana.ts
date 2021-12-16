import { PublicKey } from '@solana/web3.js';

import { PoolTokenDto } from '@app/common/jobs/pools';

export function tokensWithPrices(
  tokens: { address; reserve; price; positionInPool }[],
  prices,
): PoolTokenDto[] {
  const t0 = tokens.find((t) => t.positionInPool === 0);
  const t1 = tokens.find((t) => t.positionInPool === 1);
  let p0 = Number(prices[t0.address]);
  let p1 = Number(prices[t1.address]);
  // if we have one price we can calculate other token price
  if (p0 && p1 === 0) {
    p1 = (t0.reserve / t1.reserve) * p0;
  } else if (p1 && p0 === 0) {
    p0 = (t1.reserve / t0.reserve) * p1;
  }
  t0.price = p0;
  t1.price = p1;

  return [t0 as PoolTokenDto, t1 as PoolTokenDto];
}

export function solanaKeysToStrings(keys) {
  const converted = {};
  Object.keys(keys).forEach((k) => {
    if (Array.isArray(keys[k])) {
      converted[k] = keys[k].map((v) => v.toBase58());
    } else if (keys[k] instanceof PublicKey) {
      converted[k] = keys[k].toBase58();
    } else {
      converted[k] = keys[k];
    }
  });
  return converted;
}

export function solanaStringsToKeys(strings) {
  const converted = {};
  Object.keys(strings).forEach((k) => {
    if (Array.isArray(strings[k])) {
      converted[k] = strings[k].map((v) => new PublicKey(v));
    } else if (typeof strings[k] === 'string') {
      converted[k] = new PublicKey(strings[k]);
    } else {
      converted[k] = strings[k];
    }
  });
  return converted;
}
