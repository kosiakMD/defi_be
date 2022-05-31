import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import {
  Address,
  ChainDto,
  FeatureEnum,
  LendingErcToken,
  LendingPositionDto,
  ProjectEnum,
  ProtocolNameEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataHealth } from '@app/common/dto/base.data.health.dto';
import { BaseDataLending } from '@app/common/dto/base.data.lending.dto';
import { CallData } from '@app/common/dto/call-data';
import { HealthFactorDto } from '@app/common/dto/health-factor.dto';
import { normalizeDecimals } from '@app/common/utils';
import { CauldronContract } from '@app/common/web3provider/contracts/protocols/abracadabra/abracadabra-market';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { BaseData } from '../../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../../microservices/account.service';
import { PriceService } from '../../../../microservices/price.service';
import { ACTIVE_CAULDRONS } from '../abracadabra.constants';
import { Cauldron, IFeature } from '../abracadabra.interfaces';

@Injectable()
export class AbracadabraBorrowing implements IFeature {
  constructor(
    private readonly multicall: MulticallAggregator,
    protected readonly priceService: PriceService,
    protected readonly accountService: AccountService,
  ) {}

  async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    // Get Common Data (token details, cauldron details, etc)
    const cauldronAddresses = ACTIVE_CAULDRONS.get(chain.id);

    const cauldrons = await this.getCauldronData(cauldronAddresses, chain);

    const baseDataResults = await Promise.all(
      addresses.map((address) => this.getUserData(address, chain, cauldrons)),
    );

    return baseDataResults.flat();
  }

  async getUserData(address: Address, chain: ChainDto, cauldrons: Cauldron[]): Promise<BaseData[]> {
    const borrowingItems = [];
    const collateralItems = [];
    const healthItems = [];
    const userData = await this.getMulticallUserDetails(address, cauldrons, chain);

    cauldrons.forEach((cauldron) => {
      const collateralAmount = userData.get(`${cauldron.address}-collateral`);

      if (!collateralAmount) return; // if there is no collateral, there will be no borrowAmount, or health
      collateralItems.push(
        plainToClass(LendingPositionDto, {
          address: cauldron.address,
          balance: collateralAmount,
          // value: number; // to be filled in by price.service.ts
          token: plainToClass(LendingErcToken, {
            address: cauldron.collateralAsset.address,
            name: cauldron.collateralAsset.name,
            symbol: cauldron.collateralAsset.symbol,
            decimals: cauldron.collateralAsset.decimals,
            // price: to be filled in by price.service.ts
          }),
        }),
      );

      const borrowAmount = userData.get(`${cauldron.address}-borrow`);
      if (!borrowAmount) return; // if there is no borrow amount, there will be no 'health'
      borrowingItems.push(
        plainToClass(LendingPositionDto, {
          address: cauldron.address,
          balance: borrowAmount,
          // value: number; // to be filled in by price.service.ts
          apy: cauldron.apy,
          token: plainToClass(LendingErcToken, {
            address: cauldron.borrowAsset.address,
            name: cauldron.borrowAsset.name,
            symbol: cauldron.borrowAsset.symbol,
            decimals: cauldron.borrowAsset.decimals,
            // price: to be filled in by price.service.ts
          }),
        }),
      );

      // Aave Health Factor Formula: ((collateralValueUSD) * cauldron.collateralizationRate) / borrowValueUSD
      healthItems.push(
        plainToClass(HealthFactorDto, {
          healthFactor:
            (collateralAmount * cauldron.collateralPrice * cauldron.collateralizationRate) /
            (borrowAmount * cauldron.borrowPrice),
        }),
      );
    });

    const borrowingBaseData = this.formatBaseData(
      BaseDataLending,
      FeatureEnum.borrowing,
      address,
      chain,
      borrowingItems,
    );
    const collateralBaseData = this.formatBaseData(
      BaseDataLending,
      FeatureEnum.collateral,
      address,
      chain,
      collateralItems,
    );

    const healthBaseData = this.formatBaseData(
      BaseDataHealth,
      FeatureEnum.health,
      address,
      chain,
      healthItems,
    );

    // get cauldrons
    // multicall to get borrowed amount

    return [].concat(borrowingBaseData, collateralBaseData, healthBaseData);
  }

  private async getCauldronData(cauldrons: Address[], chain: ChainDto): Promise<Cauldron[]> {
    const multicallCauldronDetails = await this.getMulticallCauldronDetails(cauldrons, chain);

    const assets = await this.getAllCauldronAssets(cauldrons, multicallCauldronDetails, chain);

    const { prices } = await this.priceService.getTokenPricesFetch(
      Array.from(assets.keys()),
      chain.id,
    );

    const mim = assets.get(
      multicallCauldronDetails.get('magic-internet-money').output.data.toString().toLowerCase(),
    );

    return await Promise.all(
      cauldrons.map(async (cauldron) => {
        // Max collateralization (used to calculate health)
        const collateralizationRate =
          Number(
            multicallCauldronDetails.get(`${cauldron}-collaterization-rate`).output.data.toString(),
          ) / 100000;

        // APY
        const { INTEREST_PER_SECOND: interestPerSecond } = multicallCauldronDetails.get(
          `${cauldron}-accrue-info`,
        ).output.data;

        const secondsInAYear = 60 * 60 * 24 * 365;
        const apy = new BigNumber(interestPerSecond)
          .multipliedBy(secondsInAYear)
          .dividedBy(1e18)
          .toNumber();

        const collateralAddress = multicallCauldronDetails
          .get(`${cauldron}-collateral`)
          .output.data.toString()
          .toLowerCase();

        const collateral =
          assets.get(collateralAddress) ??
          (await this.accountService.getTrackedAssets(collateralAddress, chain.id));

        return plainToClass(Cauldron, {
          address: cauldron, // cauldron address
          collateralAsset: collateral,
          collateralPrice: Number(prices[collateral.address]),
          borrowAsset: mim,
          borrowPrice: Number(prices[mim.address]),
          collateralizationRate,
          apy,
        });
      }),
    );
  }

  private async getAllCauldronAssets(
    cauldrons: Address[],
    cauldronMulticall: Map<string, CallData>,
    chain: ChainDto,
  ) {
    const borrowAsset = cauldronMulticall // borrow token is common to all strategies
      .get(`magic-internet-money`)
      .output.data.toString()
      .toLowerCase();

    const involvedAssets = cauldrons
      .map((address) =>
        cauldronMulticall.get(`${address}-collateral`).output.data.toString().toLowerCase(),
      )
      .concat(borrowAsset);

    const { data } = await this.accountService.getAssets(Array.from(new Set(involvedAssets)), [
      chain.id,
    ]);

    return new Map(data.map((asset) => [asset.address, asset]));
  }

  private getMulticallCauldronDetails(
    cauldrons: Address[],
    chain: ChainDto,
  ): Promise<Map<string, CallData>> {
    const calls = new Map();

    cauldrons.forEach((cauldronAddress) => {
      const cauldronContract = new CauldronContract(cauldronAddress);
      calls.set(`${cauldronAddress}-collaterization-rate`, cauldronContract.collaterizationRate());
      calls.set(`${cauldronAddress}-accrue-info`, cauldronContract.accrueInfo()); // interest acrued
      calls.set(`${cauldronAddress}-collateral`, cauldronContract.collateral()); // collateral token
      calls.set(`magic-internet-money`, cauldronContract.magicInternetMoney()); // borrowed token
    });

    return this.multicall.handleInBatches(calls, chain.id);
  }

  private async getMulticallUserDetails(address: Address, cauldrons: Cauldron[], chain: ChainDto) {
    const calls = new Map();
    cauldrons.forEach((cauldron) => {
      const cauldronContract = new CauldronContract(cauldron.address);
      calls.set(`${cauldron.address}-collateral`, cauldronContract.userCollateralShare(address));
      calls.set(`${cauldron.address}-borrow`, cauldronContract.userBorrowPart(address));
    });

    const multicallResponse = await this.multicall.handleInBatches(calls, chain.id);

    const response = new Map();
    cauldrons.forEach((cauldron) => {
      response.set(
        `${cauldron.address}-collateral`,
        normalizeDecimals(
          multicallResponse.get(`${cauldron.address}-collateral`).output.data.toString(),
          cauldron.collateralAsset.decimals,
        ),
      );

      response.set(
        `${cauldron.address}-borrow`,
        normalizeDecimals(
          multicallResponse.get(`${cauldron.address}-borrow`).output.data.toString(),
          cauldron.borrowAsset.decimals,
        ),
      );
    });
    return response;
  }

  private formatBaseData<T, K>(
    type: any,
    feature: FeatureEnum,
    address: Address,
    chain: ChainDto,
    items: K[],
  ): T {
    return plainToClass(type, {
      chain,
      projectName: ProjectEnum.abracadabra,
      protocolName: ProtocolNameEnum.abracadabra,
      userAddress: address,
      protocolType: ProtocolTypeEnum.borrowing,
      feature,
      items,
    });
  }
}
