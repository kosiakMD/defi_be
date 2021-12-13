import { CallInput, MultiCall } from '@indexed-finance/multicall';
import { ChainDto } from 'account_service_consumers/apps/migration_transactions_consumer/src/price/dto/chain.dto';

import { Address, Logger } from '@app/common';
import { Web3Interface } from '@app/common/web3provider';

import { AaveIncentivesControllerAbi } from '../../../../controllers/aave.incentives.controller.abi';
import { IncentivesController, LendingPool } from './aave.constants';
import { IUserAccountData } from './aave.interfaces';
import { AaveLendingPoolAbi } from './contracts/aave.lending.pool.abi';
import { AaveCommonTokenAbi } from './contracts/aave.token.abi';

export class AaveLocalMulticall extends MultiCall {
  constructor(private readonly web3: Web3Interface, private readonly logger: Logger) {
    super(web3);
    this.logger = logger;
  }

  async getNotEmptyBalancesOf(assets: Address[], address: Address): Promise<Map<string, string>> {
    const inputs = assets.map((asset) => {
      const input: CallInput = {
        target: asset,
        function: 'balanceOf',
        args: [address],
      };
      return input;
    });

    const [, balances] = await this.multiCall(AaveCommonTokenAbi, inputs);

    const filteredBalances = assets
      .map((asset, idx): [string, string] => [asset, balances[idx].toString()])
      .filter(([, balance]) => balance !== '0');

    return new Map<string, string>(filteredBalances);
  }

  async getRewardsBalance(user: Address, assets: Address[], chain: ChainDto): Promise<string> {
    const inputs: CallInput[] = [
      {
        target: IncentivesController.get(chain.id),
        function: 'getRewardsBalance',
        args: [assets, user],
      },
    ];

    const [, [rewardsBalances]] = await this.multiCall(AaveIncentivesControllerAbi, inputs);
    return rewardsBalances?.toString() ?? '0';
  }

  async getUserAccountData(user: Address, chain: ChainDto): Promise<IUserAccountData> {
    const inputs: CallInput[] = [
      {
        target: LendingPool.get(chain.id),
        function: 'getUserAccountData',
        args: [user],
      },
    ];

    const [, [userAccountData]] = await this.multiCall(AaveLendingPoolAbi, inputs);

    return {
      totalCollateralETH: userAccountData.totalCollateralETH,
      totalDebtETH: userAccountData.totalDebtETH,
      availableBorrowsETH: userAccountData.availableBorrowsETH,
      currentLiquidationThreshold: userAccountData.currentLiquidationThreshold,
      ltv: userAccountData.ltv,
      healthFactor: userAccountData.healthFactor,
    };
  }

  async getRewardToken(chain: ChainDto): Promise<string> {
    const inputs: CallInput[] = [
      {
        target: IncentivesController.get(chain.id),
        function: 'REWARD_TOKEN',
        args: [],
      },
    ];

    const [, [rewardTokenAddress]] = await this.multiCall(AaveIncentivesControllerAbi, inputs);

    return rewardTokenAddress;
  }
}
