import axios from 'axios';

import { getTokens } from '../api/solana-scan.api';
import { log, logError } from '../utils/logger';

export async function execute(): Promise<void> {
  log('Starting.');

  const {
    data: { total },
  } = await getTokens();
  log('Total number of tokens', total);

  const limit = 50;
  const solanaChainId = 12;

  for (let index = 0; index < total; index += limit) {
    try {
      const {
        data: { data },
      } = await getTokens(index, limit);

      for (const { mintAddress, tokenSymbol, priceUst } of data) {
        if (priceUst) {
          log(`[${index}] Saving ${tokenSymbol} token for Solana platform`);
          try {
            await axios.post('https://account.4849018412.defiyield.app/v1/assets', {
              address: mintAddress,
              chain: solanaChainId,
            });
            log(`[${index}] Saving ${tokenSymbol} token for Solana platform`);
          } catch (e) {
            logError(`[${index}] Token ${tokenSymbol}  saving error`, e);
          }
        }
      }
    } catch (err) {
      logError(`Token checking error`, err);
    }
  }

  log('Completed.');
}
