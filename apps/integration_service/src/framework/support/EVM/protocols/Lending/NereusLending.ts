import BigNumber from 'bignumber.js';

import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';

import { INamedFunctionPredicates, INamedFunctions, IRootProtocol } from '../../../interfaces';
import { Aave2LendingFeatureMinimal, AaveV2Lending } from './AaveV2Lending';

export class NereusLending extends AaveV2Lending implements IRootProtocol {
  poolFunctions: INamedFunctions = {};
  incentivesFunctions: INamedFunctions = null;

  protected poolFunctionPredicates: INamedFunctionPredicates = {
    getUserAccountData: () => (item) => item.name === 'getUserAccountData',
    getReserveData: () => (item) => item.name === 'getReserveData',
    getReservesList: () => (item) => item.name === 'getReservesList',
  };

  async getCacheableOpportunityData(): Promise<Aave2LendingFeatureMinimal[]> {
    const poolContract = new DynamicContract(this.meta.address);

    const reserveListCall = poolContract.createCall(this.poolFunctions.getReservesList);

    const reservesList = await this.multicall.call(reserveListCall, this.meta.chain);
    const reserveDataCalls = [];

    reservesList.forEach((reserveAddress) => {
      reserveDataCalls.push(
        poolContract.createCall(this.poolFunctions.getReserveData, reserveAddress),
      );
    });

    const reserveData = await this.multicall.callArray(reserveDataCalls, this.meta.chain);

    const reserveTotalSuppliedCalls = [];
    const variableDebtCalls = [];
    const stableDebtCalls = [];

    reserveData.forEach(({ aTokenAddress, stableDebtTokenAddress, variableDebtTokenAddress }) => {
      const aTokenContract = new ERC20(aTokenAddress);
      reserveTotalSuppliedCalls.push(aTokenContract.totalSupply());

      const vTokenContract = new ERC20(variableDebtTokenAddress);
      variableDebtCalls.push(vTokenContract.totalSupply());

      const sTokenContract = new ERC20(stableDebtTokenAddress);
      stableDebtCalls.push(sTokenContract.totalSupply());
    });
    const [aTokenSupply, vTokenSupply, sTokenSupply] = await Promise.all([
      this.multicall.callArray(reserveTotalSuppliedCalls, this.meta.chain),
      this.multicall.callArray(variableDebtCalls, this.meta.chain),
      this.multicall.callArray(stableDebtCalls, this.meta.chain),
    ]);

    return reserveData.map(
      (
        {
          aTokenAddress,
          stableDebtTokenAddress,
          variableDebtTokenAddress,
          currentLiquidityRate,
          currentVariableBorrowRate,
          currentStableBorrowRate,
        },
        index,
      ) => {
        const underlyingAsset = reservesList[index];
        const totalATokenSupply = aTokenSupply[index];
        const totalCurrentVariableDebt = vTokenSupply[index];
        const totalPrincipalStableDebt = sTokenSupply[index];

        const borrowRate = {};
        this.updateBorrowRateField(
          'variableApy',
          currentVariableBorrowRate,
          totalCurrentVariableDebt,
          borrowRate,
        );

        this.updateBorrowRateField(
          'stableApy',
          currentStableBorrowRate,
          totalPrincipalStableDebt,
          borrowRate,
        );

        return {
          feature: this.meta.feature,
          chain: this.meta.chain,
          id: aTokenAddress,
          sTokenAddress: stableDebtTokenAddress,
          vTokenAddress: variableDebtTokenAddress,
          supplied: [
            {
              token: { address: underlyingAsset.toLowerCase() },
              totalSupplied: totalATokenSupply.toString(),
              apy: {
                year: new BigNumber(currentLiquidityRate) //
                  .dividedBy(27)
                  .toNumber(),
              },
            },
          ],
          borrowed: [
            {
              token: { address: underlyingAsset.toLowerCase() },
              totalBorrowed: new BigNumber(totalCurrentVariableDebt as any)
                .plus(new BigNumber(totalPrincipalStableDebt as any))
                .toString(),
              apy: borrowRate,
            },
          ],
          rewarded: [],
        };
      },
    );
  }

  async initialize() {
    this.logger.log(
      `Initializing: ${this.meta.name} ${this.meta.chain}/${this.meta.address}`,
      `SingleContractProtocol/${this.constructor.name}`,
    );

    this.poolFunctions = await this.abiService.parseFunctionsFromAddress(
      '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9',
      1,
      this.poolFunctionPredicates,
    );

    this.logger.log(
      `${this.meta.chain}/${this.meta.address} found ${Object.keys(this.poolFunctions).length}/${
        Object.keys(this.poolFunctionPredicates).length
      } functions`,
      `EVMCore/${this.constructor.name}`,
    );
  }
}
