import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import {
  Address,
  ChainDto,
  FeatureEnum,
  ProjectEnum,
  ProtocolNameEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BalanceData, BaseDataLocked, LockedToken } from '@app/common/dto/base.data.locked.dto';
import { normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Asset } from '../../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../../microservice/account.service';
import { PriceService } from '../../../../microservice/price.service';
import { gOhmContract } from '../contracts/g-ohm-contract';
import { OlympusBondDepositoryV2 } from '../contracts/olympus-bond-depository-v2';
import { IIndexesFor, INote } from '../contracts/olympus-bond-depository-v2.interfaces';
import {
  GOVERNANCE_OHM,
  OHM_ADDRESS,
  OLYMPUS_BOND_DEPOSITORY_V2_ADDRESS,
} from '../olympus.constants';

@Injectable()
export class OlympusBonding {
  constructor(
    private readonly multicall: MulticallAggregator,
    protected readonly priceService: PriceService,
    protected readonly accountService: AccountService,
  ) {}

  async getData(addresses: Address[], chain: ChainDto): Promise<any[]> {
    const contract = new OlympusBondDepositoryV2(OLYMPUS_BOND_DEPOSITORY_V2_ADDRESS);

    const indexCalls = new Map(
      addresses.map((address) => [`indexesFor(${address})`, contract.indexesFor(address)]),
    );
    const indexResults = await this.multicall.handleInBatches<IIndexesFor>(indexCalls, chain.id);

    const notesCalls = new Map(
      addresses.flatMap((address) => {
        const indexes = indexResults.get(`indexesFor(${address})`).output.data;
        return indexes.map((index) => [
          `notes(${address}, ${index})`,
          contract.notes(address, index),
        ]);
      }),
    );
    const notesResults = await this.multicall.handleInBatches<INote>(notesCalls, chain.id);

    const [tokens, gohmIndex] = await this.getOlympusTokens(chain);

    return addresses.map((address) => {
      const baseInfo: BaseDataLocked = plainToClass(BaseDataLocked, {
        chain,
        projectName: ProjectEnum.olympus,
        protocolName: ProtocolNameEnum.olympus,
        userAddress: address,
        protocolType: ProtocolTypeEnum.staking,
        feature: FeatureEnum.lockedBalances,
        items: [],
      });
      const indexes = indexResults.get(`indexesFor(${address})`).output.data;

      indexes.map((index) => {
        const note = notesResults.get(`notes(${address}, ${index})`).output.data;
        const ohm = tokens.get(OHM_ADDRESS);
        const gOhm = tokens.get(GOVERNANCE_OHM);

        const isMatured = new Date(Number(note.matured.toString()) * 1000) <= new Date();

        const gohmBalance = normalizeDecimals(note.payout, gOhm.decimals);

        // get ohm balance by calculating gohm/ohm price
        const balance = gohmBalance * gohmIndex;

        baseInfo.items.push(
          plainToClass(LockedToken, {
            address: ohm.address,
            name: ohm.name,
            symbol: ohm.symbol,
            decimals: ohm.decimals,
            // TODO: When Front End displays unlocked balances,
            // switch to display unlocked balances here
            locked: plainToClass(BalanceData, { balance: isMatured ? balance : balance }),
            // locked: plainToClass(BalanceData, { balance: isMatured ? 0 : balance }),
            unlocked: plainToClass(BalanceData, { balance: isMatured ? 0 : 0 }),
            // unlocked: plainToClass(BalanceData, { balance: isMatured ? balance : 0 }),
          }),
        );
      });

      return baseInfo;
    });
  }

  async getOlympusTokens(chain: ChainDto): Promise<[Map<Address, Asset>, number]> {
    const rawTokens = await this.accountService.getAssets(
      [OHM_ADDRESS, GOVERNANCE_OHM],
      [chain.id],
    );

    // Convert To Map
    const tokens = new Map<Address, Asset>(rawTokens.data.map((token) => [token.address, token]));

    // Get gOHM Index
    const gOhm = new gOhmContract(GOVERNANCE_OHM);
    const gohmIndexCall = await this.multicall.call(gOhm.index(), chain.id);
    const index = normalizeDecimals(gohmIndexCall.toString(), tokens.get(OHM_ADDRESS).decimals);

    return [tokens, index];
  }
}
