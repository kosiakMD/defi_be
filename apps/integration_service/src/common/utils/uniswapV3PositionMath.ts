/**
 * Adapted from:
 * https://github.com/Uniswap/uniswap-sdk-core
 * https://github.com/Uniswap/uniswap-v3-sdk
 */
import BN from 'bn.js';

import { UniswapV3Tick } from '@app/common';
import { MaxUint256, ONE, Q128, Q256, Q32, Q96, ZERO } from '@app/common/constant/numbers';

function subIn256(...numbers: BN[]): BN {
  if (numbers.length <= 1) return numbers[0];

  const [num0, num1] = numbers.splice(0, 2);

  const difference = num0.sub(num1);

  const total = difference.lt(new BN(0)) ? Q256.add(difference) : difference;

  return subIn256(total, ...numbers);
}

function getTicksFeeGrowthInside(
  tickCurrent: number,
  tickLower: UniswapV3Tick,
  tickUpper: UniswapV3Tick,
  feeGrowthGlobal0X128: string,
  feeGrowthGlobal1X128: string,
): { feeGrowthInside0X128: BN; feeGrowthInside1X128: BN } {
  let feeGrowthBelow0X128: BN;
  let feeGrowthBelow1X128: BN;
  if (tickCurrent >= tickLower.tick) {
    feeGrowthBelow0X128 = new BN(tickLower.feeGrowthOutside0X128);
    feeGrowthBelow1X128 = new BN(tickLower.feeGrowthOutside1X128);
  } else {
    feeGrowthBelow0X128 = subIn256(
      new BN(feeGrowthGlobal0X128),
      new BN(tickLower.feeGrowthOutside0X128),
    );
    feeGrowthBelow1X128 = subIn256(
      new BN(feeGrowthGlobal1X128),
      new BN(tickLower.feeGrowthOutside1X128),
    );
  }

  // calculate fee growth above
  let feeGrowthAbove0X128: BN;
  let feeGrowthAbove1X128: BN;
  if (tickCurrent < tickUpper.tick) {
    feeGrowthAbove0X128 = new BN(tickUpper.feeGrowthOutside0X128);
    feeGrowthAbove1X128 = new BN(tickUpper.feeGrowthOutside1X128);
  } else {
    feeGrowthAbove0X128 = subIn256(
      new BN(feeGrowthGlobal0X128),
      new BN(tickUpper.feeGrowthOutside0X128),
    );
    feeGrowthAbove1X128 = subIn256(
      new BN(feeGrowthGlobal1X128),
      new BN(tickUpper.feeGrowthOutside1X128),
    );
  }

  const feeGrowthInside0X128 = subIn256(
    new BN(feeGrowthGlobal0X128),
    feeGrowthBelow0X128,
    feeGrowthAbove0X128,
  );
  const feeGrowthInside1X128 = subIn256(
    new BN(feeGrowthGlobal1X128),
    feeGrowthBelow1X128,
    feeGrowthAbove1X128,
  );

  return { feeGrowthInside0X128, feeGrowthInside1X128 };
}

function mulDiv(a: BN, b: BN, denominator: BN): BN {
  const product = a.mul(b);
  return product.div(denominator);
}

// https://github.com/Uniswap/v3-sdk/blob/b50b02238d4d4f04dbaa04d531e5ff8dd76d63d9/src/utils/fullMath.ts#L10
function mulDivRoundingUp(a: BN, b: BN, denominator: BN): BN {
  const product = a.mul(b);
  let result = product.div(denominator);
  if (!product.mod(denominator).eq(ZERO)) result = result.add(ONE);
  return result;
}

// https://github.com/Uniswap/v3-sdk/blob/b50b02238d4d4f04dbaa04d531e5ff8dd76d63d9/src/utils/sqrtPriceMath.ts#L25
function getAmount0Delta(
  sqrtRatioAX96: BN,
  sqrtRatioBX96: BN,
  liquidity: BN,
  roundUp: boolean,
): BN {
  if (sqrtRatioAX96.gt(sqrtRatioBX96)) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  const numerator1 = liquidity.shln(96);
  const numerator2 = sqrtRatioBX96.sub(sqrtRatioAX96);

  return roundUp
    ? mulDivRoundingUp(mulDivRoundingUp(numerator1, numerator2, sqrtRatioBX96), ONE, sqrtRatioAX96)
    : new BN(new BN(numerator1.mul(numerator2)).div(sqrtRatioBX96)).div(sqrtRatioAX96);
}

// https://github.com/Uniswap/v3-sdk/blob/b50b02238d4d4f04dbaa04d531e5ff8dd76d63d9/src/utils/sqrtPriceMath.ts#L38
function getAmount1Delta(
  sqrtRatioAX96: BN,
  sqrtRatioBX96: BN,
  liquidity: BN,
  roundUp: boolean,
): BN {
  if (sqrtRatioAX96.gt(sqrtRatioBX96)) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  return roundUp
    ? mulDivRoundingUp(liquidity, sqrtRatioBX96.sub(sqrtRatioAX96), Q96)
    : liquidity.mul(sqrtRatioBX96.sub(sqrtRatioAX96)).div(Q96);
}

// https://github.com/Uniswap/v3-sdk/blob/b50b02238d4d4f04dbaa04d531e5ff8dd76d63d9/src/utils/tickMath.ts#L7
function mulShift(val: BN, mulBy: string): BN {
  return val.mul(new BN(mulBy)).shrn(128);
}

// https://github.com/Uniswap/v3-sdk/blob/b50b02238d4d4f04dbaa04d531e5ff8dd76d63d9/src/utils/tickMath.ts#L41
function getSqrtRatioAtTick(tick: number): BN {
  const absTick: number = tick < 0 ? tick * -1 : tick;

  let ratio: BN =
    (absTick & 0x1) !== 0
      ? new BN(BigInt('0xfffcb933bd6fad37aa2d162d1a594001').toString())
      : new BN(BigInt('0x100000000000000000000000000000000').toString());
  if ((absTick & 0x2) !== 0)
    ratio = mulShift(ratio, BigInt('0xfff97272373d413259a46990580e213a').toString());
  if ((absTick & 0x4) !== 0)
    ratio = mulShift(ratio, BigInt('0xfff2e50f5f656932ef12357cf3c7fdcc').toString());
  if ((absTick & 0x8) !== 0)
    ratio = mulShift(ratio, BigInt('0xffe5caca7e10e4e61c3624eaa0941cd0').toString());
  if ((absTick & 0x10) !== 0)
    ratio = mulShift(ratio, BigInt('0xffcb9843d60f6159c9db58835c926644').toString());
  if ((absTick & 0x20) !== 0)
    ratio = mulShift(ratio, BigInt('0xff973b41fa98c081472e6896dfb254c0').toString());
  if ((absTick & 0x40) !== 0)
    ratio = mulShift(ratio, BigInt('0xff2ea16466c96a3843ec78b326b52861').toString());
  if ((absTick & 0x80) !== 0)
    ratio = mulShift(ratio, BigInt('0xfe5dee046a99a2a811c461f1969c3053').toString());
  if ((absTick & 0x100) !== 0)
    ratio = mulShift(ratio, BigInt('0xfcbe86c7900a88aedcffc83b479aa3a4').toString());
  if ((absTick & 0x200) !== 0)
    ratio = mulShift(ratio, BigInt('0xf987a7253ac413176f2b074cf7815e54').toString());
  if ((absTick & 0x400) !== 0)
    ratio = mulShift(ratio, BigInt('0xf3392b0822b70005940c7a398e4b70f3').toString());
  if ((absTick & 0x800) !== 0)
    ratio = mulShift(ratio, BigInt('0xe7159475a2c29b7443b29c7fa6e889d9').toString());
  if ((absTick & 0x1000) !== 0)
    ratio = mulShift(ratio, BigInt('0xd097f3bdfd2022b8845ad8f792aa5825').toString());
  if ((absTick & 0x2000) !== 0)
    ratio = mulShift(ratio, BigInt('0xa9f746462d870fdf8a65dc1f90e061e5').toString());
  if ((absTick & 0x4000) !== 0)
    ratio = mulShift(ratio, BigInt('0x70d869a156d2a1b890bb3df62baf32f7').toString());
  if ((absTick & 0x8000) !== 0)
    ratio = mulShift(ratio, BigInt('0x31be135f97d08fd981231505542fcfa6').toString());
  if ((absTick & 0x10000) !== 0)
    ratio = mulShift(ratio, BigInt('0x9aa508b5b7a84e1c677de54f3e99bc9').toString());
  if ((absTick & 0x20000) !== 0)
    ratio = mulShift(ratio, BigInt('0x5d6af8dedb81196699c329225ee604').toString());
  if ((absTick & 0x40000) !== 0)
    ratio = mulShift(ratio, BigInt('0x2216e584f5fa1ea926041bedfe98').toString());
  if ((absTick & 0x80000) !== 0)
    ratio = mulShift(ratio, BigInt('0x48a170391f7dc42444e8fa2').toString());

  if (tick > 0) ratio = MaxUint256.div(ratio);

  // back to Q96
  return ratio.mod(Q32).gt(ZERO) ? ratio.div(Q32).add(ONE) : ratio.div(Q32);
}

function normalizeToString(number: BN, decimals: number): string {
  /**
   * Here we need to convert the BN to a string, then cast as Number().
   * If we use the built in BN.toNumber() it throws an error since
   * `Error: Number can only safely store up to 53 bits`
   */
  return (Number(number.toString()) / 10 ** decimals).toString();
}

export function calculateTokensOwed({
  tickCurrent,
  tickLower,
  tickUpper,
  feeGrowthInside0LastX128,
  feeGrowthInside1LastX128,
  feeGrowthGlobal0X128,
  feeGrowthGlobal1X128,
  liquidity,
}: {
  tickCurrent: number;
  tickLower: UniswapV3Tick;
  tickUpper: UniswapV3Tick;
  feeGrowthInside0LastX128: string;
  feeGrowthInside1LastX128: string;
  feeGrowthGlobal0X128: string;
  feeGrowthGlobal1X128: string;
  liquidity: string;
}): { amount0: string; amount1: string } {
  const { feeGrowthInside0X128, feeGrowthInside1X128 } = getTicksFeeGrowthInside(
    tickCurrent,
    tickLower,
    tickUpper,
    feeGrowthGlobal0X128,
    feeGrowthGlobal1X128,
  );

  const amount0 = mulDiv(
    feeGrowthInside0X128.sub(new BN(feeGrowthInside0LastX128)),
    new BN(liquidity),
    Q128,
  );

  const amount1 = mulDiv(
    feeGrowthInside1X128.sub(new BN(feeGrowthInside1LastX128)),
    new BN(liquidity),
    Q128,
  );

  return {
    amount0: amount0.abs().toString(),
    amount1: amount1.abs().toString(),
  };
}

export function calculatePositionAmounts({
  tickCurrent,
  tickLower,
  tickUpper,
  liquidity,
  sqrtPrice,
  token0Decimal,
  token1Decimal,
}: {
  tickCurrent: number;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  sqrtPrice: string;
  token0Decimal: number;
  token1Decimal: number;
}): { amount0: string; amount1: string } {
  const BNliquidity = new BN(liquidity); // position virtual liquidity
  const sqrtRatioX96 = new BN(sqrtPrice);
  if (tickCurrent < tickLower) {
    // all in token0
    return {
      amount0: normalizeToString(
        getAmount0Delta(
          getSqrtRatioAtTick(tickLower),
          getSqrtRatioAtTick(tickUpper),
          BNliquidity,
          true,
        ),
        token0Decimal,
      ),
      amount1: '0',
    };
  } else if (tickCurrent < tickUpper) {
    // split between token0, token1
    return {
      amount0: normalizeToString(
        getAmount0Delta(sqrtRatioX96, getSqrtRatioAtTick(tickUpper), BNliquidity, true),
        token0Decimal,
      ),
      amount1: normalizeToString(
        getAmount1Delta(getSqrtRatioAtTick(tickLower), sqrtRatioX96, BNliquidity, true),
        token1Decimal,
      ),
    };
  } else {
    // all in token1
    return {
      amount0: '0',
      amount1: normalizeToString(
        getAmount1Delta(
          getSqrtRatioAtTick(tickLower),
          getSqrtRatioAtTick(tickUpper),
          BNliquidity,
          true,
        ),
        token1Decimal,
      ),
    };
  }
}
