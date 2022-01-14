import { execute } from './tracked_tokens/solana-scan';
import { log } from './utils/logger';

execute().then(() => log('Done.'));