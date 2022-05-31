/* eslint-disable @typescript-eslint/ban-ts-comment */
import { plainToClass } from 'class-transformer';
import { EntityManager, getManager, In, Repository } from 'typeorm';

import { Inject, LoggerService, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CHAIN_ID_BSC, CHAIN_ID_ETH, DEFAULT_MULTIPLIER } from '@app/common/constant';
import { ChainNameEnum, ResultStatus } from '@app/common/enum';
import { DetailedResponse } from '@app/common/interfaces';
import { Address, ChainId } from '@app/common/types';
import { getUniqList } from '@app/common/utils';
import { getAbsoluteChainIds } from '@app/common/utils/chains';

import { Covalent } from '../../common/interfaces/covalent.interface';
import { CovalentService } from '../../common/providers/3rdparty/covalent.service';
import { BscScanService } from '../../common/providers/chain-related/scans/bsc-scan.service';
import { EtherScanService } from '../../common/providers/chain-related/scans/ether-scan.service';
import { ScanApiService } from '../../common/providers/chain-related/scans/scan-api.service';
import { Web3Provider } from '../../common/providers/chain-related/web3.provider';
import { excludeSecondArray, getUniqueAndToLowerCaseArrayData } from '../../common/utils';

import { BlacklistService } from '../blacklists/blacklist.service';
import { ChainsService } from '../chains/chains.service';
import { TransactionNewDto, TransactionsDto } from './dto/transactions.dto';
import { TransactionsNewEntity } from './entities/transactions.new.entity';
import { Transaction, TransactionsResponse, TransactionsResult } from './transactions.interfaces';

export class TransactionsService implements OnModuleInit {
  addresses: string;
  addressesArray: Address[];
  manager: EntityManager;
  private ethChainId: number;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
    private readonly web3Provider: Web3Provider,
    private readonly bscScanService: BscScanService,
    private readonly etherScanService: EtherScanService,
    private readonly covalentService: CovalentService,
    @InjectRepository(TransactionsNewEntity)
    private readonly transactionRepository: Repository<TransactionsNewEntity>,
    private readonly blacklistService: BlacklistService,
    private readonly chainsService: ChainsService,
  ) {}

  async onModuleInit() {
    this.ethChainId = await this.chainsService.getChainIdByName(ChainNameEnum.eth);
  }

  public async getTransactions(addresses: string[]): Promise<TransactionsResponse | []> {
    if (await this.isAddressesNotCorrect(addresses)) return [];

    this.prepareAddresses(addresses);
    this.manager = getManager();

    const ethTransactions = await this.loadETHTransactions();
    const bscTransactions = await this.loadBSCTransactions();

    const calculatedEthTransactions = this.calculateFields(ethTransactions, 1);
    const calculatedBscTransactions = this.calculateFields(bscTransactions, 2);
    const allTransactions = calculatedEthTransactions.concat(calculatedBscTransactions);

    return this.toTransactionsResponse(allTransactions);
  }

  public async getTransactionsNew(
    addresses: Address[],
    chains: number[],
  ): Promise<DetailedResponse<TransactionNewDto[]>> {
    const response = {
      status: ResultStatus.ok,
      errors: [],
      data: [],
    };
    const blacklistedAddresses: string[] = await this.blacklistService.filterIsBlacklisted(
      addresses,
    );

    addresses = excludeSecondArray(addresses, blacklistedAddresses);
    if (addresses.length === 0) {
      return response;
    }
    try {
      const dbTsxNew: TransactionsNewEntity[] = await this.transactionRepository.find({
        where: { address: In(addresses), isVisible: true, chainId: In(chains) },
        order: { timestamp: 'ASC' },
      });
      response.data = plainToClass(TransactionNewDto, dbTsxNew);
      return response;
    } catch (e) {
      this.logger.error(e, 'getTransactionsNew');
      throw e;
    }
  }

  async getTransactionsFromScan(
    addresses: Address[],
    chains: number[],
  ): Promise<DetailedResponse<TransactionsResult[]>> {
    const response = {
      status: ResultStatus.ok,
      errors: [],
      data: [],
    };
    //
    const concatTxs = (newTxs): TransactionsResult[] =>
      (response.data = response.data.concat(newTxs));

    if (chains?.length) {
      const handleChain = async (chainId, service: ScanApiService): Promise<any> => {
        if (chains.includes(chainId)) {
          const txs = await Promise.allSettled(
            addresses.map((address) => service.getScanTransactions(address)),
          );
          txs.forEach((tx) => {
            if (tx.status === 'fulfilled') {
              concatTxs(tx.value.data);
              if (tx.value.errors) response.errors.push(tx.value.errors);
            } else {
              response.errors.push(tx.reason);
            }
          });
        }
      };
      await Promise.all([
        handleChain(CHAIN_ID_ETH, this.etherScanService),
        handleChain(CHAIN_ID_BSC, this.bscScanService),
      ]);
    } else {
      const [ethTransactions, bscTransactions] = await Promise.allSettled([
        Promise.all(addresses.map(this.etherScanService.getScanTransactions)),
        Promise.all(addresses.map(this.bscScanService.getScanTransactions)),
      ]);

      const checkFulfillment = (chainsTxResults): any => {
        chainsTxResults.forEach((chainTxsResult) => {
          if (chainTxsResult.status === 'fulfilled') {
            chainTxsResult.value.forEach((tx) => {
              concatTxs(tx.transactions);
              if (tx.error) response.errors.push(tx.error);
            });
          } else {
            response.errors.push(chainTxsResult.reason);
          }
        });
        if (response.errors.length) {
          response.status = ResultStatus.error;
        }
        return response;
      };

      checkFulfillment([ethTransactions, bscTransactions]);
    }

    if (response.errors.length) {
      response.status = ResultStatus.error;
    }
    return response;
  }

  async getTransactionsFromCovalent(
    addresses: Address[],
    chains: ChainId[],
  ): Promise<DetailedResponse<TransactionsResult[]>> {
    const response = {
      status: ResultStatus.ok,
      errors: [],
      data: [],
    };

    const chainsToHandle = getAbsoluteChainIds(getUniqList(chains));
    const addressesToHandle = getUniqueAndToLowerCaseArrayData(addresses);

    const promises = [];
    addressesToHandle.forEach((address) => {
      chainsToHandle.forEach((chain) => {
        promises.push(this.covalentService.getTransactions(address, chain));
      });
    });

    const results = await Promise.allSettled<Covalent.Transaction>(promises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const intTsx = this.transformCovalentToInternal(result.value, chainsToHandle[index]);
        response.data = response.data.concat(intTsx);
      } else {
        response.errors.push(result.reason?.message || result.reason);
      }
    });

    if (response.errors.length) {
      response.status = ResultStatus.error;
    }

    return response;
  }

  private static convertAddresses(addresses: string[]): string {
    return addresses.map((address) => `'${address}'`).join(',');
  }

  private async isAddressesNotCorrect(addresses: string[]): Promise<boolean> {
    if (!addresses.length) {
      return true;
    }
    const ethChainId = await this.web3Provider.getInstanceByChainId(this.ethChainId);
    return !addresses.every(ethChainId.utils.isAddress);
  }

  private prepareAddresses(addresses: string[]): void {
    const uniqAddresses = getUniqueAndToLowerCaseArrayData(addresses);
    this.addresses = TransactionsService.convertAddresses(uniqAddresses);
    this.addressesArray = uniqAddresses;
  }

  private toTransactionsResponse(transactions): TransactionsResponse {
    return this.addressesArray.reduce((response, address) => {
      const userTransactions: Transaction[] = transactions.filter(
        (transaction) => transaction.to === address || transaction.from === address,
      );

      return {
        ...response,
        [address]: userTransactions,
      };
    }, {});
  }

  private calculateFields(transactions, chainId): Transaction[] {
    return transactions.map((transaction) => {
      return {
        chainId,
        hash: transaction.hash,
        blockNumber: transaction.blocknumber,
        from: transaction.fromaddress,
        to: transaction.toaddress,
        blockTimestamp: transaction.blocktimestamp,
        amount: {
          eth: transaction.amount * DEFAULT_MULTIPLIER,
          usd: transaction.amount * DEFAULT_MULTIPLIER * transaction.price,
        },
        gas: {
          price: transaction.gasprice * DEFAULT_MULTIPLIER,
          eth: transaction.gasused * DEFAULT_MULTIPLIER * transaction.gasprice,
          usd: transaction.gasused * DEFAULT_MULTIPLIER * transaction.price * transaction.gasprice,
        },
      };
    });
  }

  private loadETHTransactions(): Promise<any> {
    return this.manager.query(`
    SELECT
      hash,
      t."blockNumber" as blockNumber,
      t."fromAddress" as fromAddress,
      t."toAddress" as toAddress,
      t."blockTimestamp" as blockTimestamp,
      gas,
      t."gasPrice" as gasPrice,
      t."gasUsed" as gasUsed,
      amount,
      ethprice as price
    FROM transactionseth AS t
    WHERE t."fromAddress" IN (${this.addresses})
    OR t."toAddress" IN (${this.addresses})
    `);
  }

  private loadBSCTransactions(): Promise<any> {
    return this.manager.query(`
    SELECT
      hash,
      t."blockNumber" as blockNumber,
      t."fromAddress" as fromAddress,
      t."toAddress" as toAddress,
      t."blockTimestamp" as blockTimestamp,
      gas,
      t."gasPrice" as gasPrice,
      t."gasUsed" as gasUsed,
      amount,
      bnbprice as price
    FROM bsc_transactions AS t
    WHERE t."fromAddress" IN (${this.addresses})
    OR t."toAddress" IN (${this.addresses})
    `);
  }

  private transformCovalentToInternal(
    data: Covalent.Transaction,
    chainId: number,
  ): TransactionsDto[] {
    const { quote_currency: currency, items } = data;
    return items.map(
      (tsx) =>
        new TransactionsDto({
          chainId: chainId,
          // @ts-ignore
          blockNumber: tsx.block_height,
          blockHash: tsx.tx_hash,
          hash: tsx.tx_hash,
          timeStamp: tsx.block_signed_at,
          // @ts-ignore
          from: tsx.from_adress,
          // @ts-ignore
          to: tsx.to_adress,
          // @ts-ignore
          value: tsx.value,
          // @ts-ignore
          valueInCurrency: tsx.value_quote,
          // @ts-ignore
          currency: currency,
          // @ts-ignore
          gasPrice: tsx.gas_price,
          // @ts-ignore
          gasUsed: tsx.gas_spent,
          isError: tsx.successful ? '0' : '1',
        }),
    );
  }
}
