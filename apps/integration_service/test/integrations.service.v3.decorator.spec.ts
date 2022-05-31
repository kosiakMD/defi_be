import { Test } from '@nestjs/testing';

import { FeatureEnum } from '@app/common';

import { IntegrationsServiceV3Decorator } from '../src/modules/integration/integrations.service.v3.decorator';
import { v3mockResponseData } from './mocks/v3-mock-response';

describe('toV2Response should', () => {
  let result;
  let wallet;
  let firstLendingItem;
  let firstBorrowItem;
  let firstStakingItem;

  beforeAll(() => {
    result = IntegrationsServiceV3Decorator.toV2Response(v3mockResponseData);
    wallet = result.data.wallets[0];
    firstLendingItem = wallet.chains[0][FeatureEnum.lending].items[0];
    firstBorrowItem = wallet.chains[0][FeatureEnum.borrowing].items[0];
    firstStakingItem = wallet.chains[0][FeatureEnum.staking].items[0];
  });

  // Total
  it('To calculate total wallet value correctly', () => {
    expect(result.data.total).toBe(0.17531920252570293);
  });

  // Lending
  it('To calculate total lending value correctly', () => {
    expect(wallet.chains[0][FeatureEnum.lending].totalValue).toBe(0.15332893952);
  });

  it('To map correct balance to first lending item', () => {
    expect(firstLendingItem.balance).toBe(0.001517139);
  });

  it('To have correct number of lending items', () => {
    expect(wallet.chains[0][FeatureEnum.lending].items.length).toBe(3);
  });

  it('To map correct value to first lending item', () => {
    expect(firstLendingItem.value).toBe(0.08514184068);
  });

  it('To map correct apy to first lending item', () => {
    expect(firstLendingItem.apy).toBe(0.9059474194442307);
  });

  it('To map correct price to first lending item token', () => {
    expect(firstLendingItem.token.price).toBe(56.12);
  });

  it('To map correct address to first lending item token', () => {
    expect(firstLendingItem.token.address).toBe('So11111111111111111111111111111111111111112');
  });

  // Borrowing

  it('To calculate total borrow value correctly', () => {
    expect(wallet.chains[0][FeatureEnum.borrowing].totalValue).toBe(0.025588047357204564);
  });

  it('To have correct number of borrowing items', () => {
    expect(wallet.chains[0][FeatureEnum.borrowing].items.length).toBe(2);
  });

  it('To map correct balance to  first borrow item', () => {
    expect(firstBorrowItem.balance).toBe(0.023402722275253186);
  });

  it('To map correct value to first borrow item', () => {
    expect(firstBorrowItem.value).toBe(0.02548556455775072);
  });

  it('To map correct apy to first borrow item', () => {
    expect(firstBorrowItem.apy).toBe(181.0388856020871);
  });

  it('To map correct price to first borrow item token', () => {
    expect(firstBorrowItem.token.price).toBe(1.089);
  });

  it('To map correct address to first borrow item token', () => {
    expect(firstBorrowItem.token.address).toBe('SLNDpmoWTVADgEdndyvWzroNL7zSi1dF9PC3xHGtPwp');
  });

  // Staking
  it('To calculate total staking value correctly', () => {
    expect(wallet.chains[0][FeatureEnum.staking].totalValue).toBe(0.0475783103629075);
  });

  it('Staking to have correct number of items', () => {
    expect(wallet.chains[0][FeatureEnum.staking].items.length).toBe(1);
  });

  it('Staking item to have correct staked number', () => {
    expect(firstStakingItem.staked).toBe('0.001571066853037099');
  });

  it('Staking token to have correct address', () => {
    expect(firstStakingItem.stakingToken.address).toBe(
      '0xf3bc6fc080ffcc30d93df48bfa2aa14b869554bb',
    );
  });

  it('Staking token to have correct price', () => {
    expect(firstStakingItem.stakingToken.price).toBe(30.16607746761146);
  });

  it('Staking token to have correct balance', () => {
    expect(firstStakingItem.stakingToken.balance).toBe(0.001571066853037099);
  });

  it('Staking token to have correct value', () => {
    expect(firstStakingItem.stakingToken.value).toBe(0.04739292439551367);
  });

  it('Staking token to have correct tokens length', () => {
    expect(firstStakingItem.stakingToken.tokens.length).toBe(2);
  });

  it('Staking token to have correct tokens address', () => {
    expect(firstStakingItem.stakingToken.tokens[0].address).toBe(
      '0xe0e514c71282b6f4e823703a39374cf58dc3ea4f',
    );
  });

  it('Staking to have correct rewards length', () => {
    expect(firstStakingItem.rewards.length).toBe(1);
  });

  it('Staking to have correct rewards price', () => {
    expect(firstStakingItem.rewards[0].price).toBe(0.7167314704417656);
  });

  it('Staking to have correct claimable data balance', () => {
    expect(firstStakingItem.rewards[0].claimableData.balance).toBe(0.000258654705477868);
  });

  it('Staking to have correct claimable data value', () => {
    expect(firstStakingItem.rewards[0].claimableData.value).toBe(0.0001853859673938341);
  });

  it('Staking to have correct apr', () => {
    expect(firstStakingItem.rewards[0].apr).toBe(43.73591798770957);
  });
});
