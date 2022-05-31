import { u8, struct } from '@solana/buffer-layout';

import { uint64 } from './layout.util';

const LastUpdateLayout = struct([uint64('slot'), u8('stale')], 'lastUpdate');

export { LastUpdateLayout };
