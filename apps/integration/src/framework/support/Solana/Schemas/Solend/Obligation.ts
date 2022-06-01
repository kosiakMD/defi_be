import { struct, u8, blob, seq } from '@solana/buffer-layout';

import { LastUpdateLayout } from './LastUpdate';
import { publicKey, uint64, uint128 } from './layout.util';

const ObligationLayout = struct([
  u8('version'),
  LastUpdateLayout,
  publicKey('lendingMarket'),
  publicKey('owner'),
  uint128('depositedValue'),
  uint128('borrowedValue'),
  uint128('allowedBorrowValue'),
  uint128('unhealthyBorrowValue'),
  blob(64, '_padding'),
  u8('depositsLen'),
  u8('borrowsLen'),
  blob(1096, 'dataFlat'),
]);

const ObligationCollateralLayout = struct([
  publicKey('depositReserve'),
  uint64('depositedAmount'),
  uint128('marketValue'),
  blob(32, 'padding'),
]);

const ObligationLiquidityLayout = struct([
  publicKey('borrowReserve'),
  uint128('cumulativeBorrowRateWads'),
  uint128('borrowedAmountWads'),
  uint128('marketValue'),
  blob(32, 'padding'),
]);

const ObligationParser = (info) => {
  const buffer = Buffer.from(info.data);
  const {
    version,
    lastUpdate,
    lendingMarket,
    owner,
    depositedValue,
    borrowedValue,
    allowedBorrowValue,
    unhealthyBorrowValue,
    depositsLen,
    borrowsLen,
    dataFlat,
  }: any = ObligationLayout.decode(buffer);

  if (lastUpdate.slot.isZero()) {
    return null;
  }

  const depositsBuffer = dataFlat.slice(0, depositsLen * ObligationCollateralLayout.span);
  const deposits = seq(ObligationCollateralLayout, depositsLen).decode(depositsBuffer);

  const borrowsBuffer = dataFlat.slice(
    depositsBuffer.length,
    depositsLen * ObligationCollateralLayout.span + borrowsLen * ObligationLiquidityLayout.span,
  );
  const borrows = seq(ObligationLiquidityLayout, borrowsLen).decode(borrowsBuffer);

  const obligation = {
    version,
    lastUpdate,
    lendingMarket,
    owner,
    depositedValue,
    borrowedValue,
    allowedBorrowValue,
    unhealthyBorrowValue,
    deposits,
    borrows,
  };

  const details = {
    account: {
      ...info,
    },
    info: obligation,
  };

  return details;
};

export { ObligationParser };
