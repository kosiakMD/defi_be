import { struct, u8, blob } from '@solana/buffer-layout';

import { LastUpdateLayout } from './LastUpdate';
import { publicKey, uint64, uint128 } from './layout.util';

const ReserveLayout = struct([
  u8('version'),
  LastUpdateLayout,
  publicKey('lendingMarket'),
  struct(
    [
      publicKey('mintPubkey'),
      u8('mintDecimals'),
      publicKey('supplyPubkey'),
      publicKey('pythOracle'),
      publicKey('switchboardOracle'),
      uint64('availableAmount'),
      uint128('borrowedAmountWads'),
      uint128('cumulativeBorrowRateWads'),
      uint128('marketPrice'),
    ],
    'liquidity',
  ),

  struct(
    [publicKey('mintPubkey'), uint64('mintTotalSupply'), publicKey('supplyPubkey')],
    'collateral',
  ),

  struct(
    [
      u8('optimalUtilizationRate'),
      u8('loanToValueRatio'),
      u8('liquidationBonus'),
      u8('liquidationThreshold'),
      u8('minBorrowRate'),
      u8('optimalBorrowRate'),
      u8('maxBorrowRate'),
      struct([uint64('borrowFeeWad'), uint64('flashLoanFeeWad'), u8('hostFeePercentage')], 'fees'),
      uint64('depositLimit'),
      uint64('borrowLimit'),
      publicKey('feeReceiver'),
    ],
    'config',
  ),

  blob(256, 'padding'),
]);

const ReserveParser = (info) => {
  const buffer = Buffer.from(info.data);
  const reserve: any = ReserveLayout.decode(buffer);

  if (reserve.lastUpdate.slot.isZero()) {
    return null;
  }

  const details = {
    account: {
      ...info,
    },
    info: reserve,
  };

  return details;
};

export { ReserveParser };
