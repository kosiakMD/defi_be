import { execute } from './tracked_tokens';
import { log } from './utils/logger';

execute().then(() => log('Done.'));
