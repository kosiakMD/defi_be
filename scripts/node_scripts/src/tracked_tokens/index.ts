import axios from 'axios';

import { getCoins } from '../api/coingecko.api';
import { log, logError } from '../utils/logger';

const coingeckoChainMapping: { [key: string]: number } = {
  ['ethereum']: 1,
  ['binance-smart-chain']: 2,
  ['polygon-pos']: 3,
  ['fantom']: 4,
  ['arbitrum']: 5,
  ['avalanche']: 6,
};

export async function execute(): Promise<void> {
  log('Starting.');

  const { data: coins } = await getCoins();
  log('Total number of coins', coins.length);

  for (const { id, name, platforms } of coins) {
    try {
      for (const platform in platforms) {
        if (platforms[platform] && coingeckoChainMapping[platform]) {
          log(`Saving ${name} token for ${platform} platform`);
          await axios.post('https://acc.dfyield.xyz/v1/assets', {
            address: platforms[platform],
            chain: coingeckoChainMapping[platform],
          });
          log(`Saved ${name} token for ${platform} platform`);
        }
      }
    } catch (err) {
      logError(`Coin ${id} price checking error`, err);
    }
  }
  log('Completed.');
}
