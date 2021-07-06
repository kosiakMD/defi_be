import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BigNumber as BN } from 'bignumber.js';
import { plainToClass } from 'class-transformer';
import { getManager, In, Repository } from 'typeorm';
import Web3 from 'web3';

import { Web3Provider } from '../chain/web3.provider';
import { PriceService } from '../price/price.service';
import {
  CHAIN_ID_ETH,
  decimalsDivider,
  ETH_ADDRESS,
  ETH_TRANSFER_TOPIC,
  ZERO_DATA,
} from '../util/util';
import { EventDto } from './dto/event.dto';
import { ParsedTransfersDto } from './dto/parsed.transfers.dto';
import { SubTransactionDto } from './dto/sub.transaction.dto';
import { AssetsEntity } from './entities/assets.entity';
import { AssetsNewEntity } from './entities/assets.new.entity';
import { TokenOperations } from './enums/token.operations';
import { TokenTypes } from './enums/token.types';
import {
  MigrationEvent,
  MigrationTransaction,
  ParsedTransfers,
  SubTransactions,
} from './transactions.parsing.interfaces';

@Injectable()
export class TransactionsParsingService {
  private readonly ethProvider: Web3;
  constructor(
    @InjectRepository(AssetsEntity)
    private assetsRepository: Repository<AssetsEntity>,
    @InjectRepository(AssetsNewEntity)
    private assetsNewRepository: Repository<AssetsNewEntity>,
    private priceService: PriceService,
    private web3Provider: Web3Provider,
  ) {
    this.ethProvider = web3Provider.instanceEth();
  }

  async parseTransactions(transaction: MigrationTransaction): Promise<void> {
    const uniqueAddresses: Set<string> = new Set();

    await this.modifyTransaction(transaction);

    const transactionTransfers: MigrationEvent[] = this.getModifiedTransactionTransfers(
      transaction,
      uniqueAddresses,
    );

    if (!transactionTransfers.length && Number(transaction.value)) {
      TransactionsParsingService.addToSetAddress(transaction.from?.toLowerCase(), uniqueAddresses);
      TransactionsParsingService.addToSetAddress(transaction.to?.toLowerCase(), uniqueAddresses);
      transactionTransfers.push(TransactionsParsingService.getEthTransactionTransfer(transaction));
    }

    const subTransactions = await this.getArrayOfSubTransactions(transactionTransfers, transaction);
    const parsedTransfers: ParsedTransfersDto[] = await this.getParsedTransfers(
      transaction,
      uniqueAddresses,
      subTransactions,
    );
    const transactionSqlString: string = this.getTransactionSqlString(parsedTransfers, transaction);
    await getManager().query(transactionSqlString);
    return;
  }

  private getTransactionSqlString(
    parsedTransactions: ParsedTransfersDto[],
    transaction: MigrationTransaction,
  ): string {
    const sqlValues: string[] = [];
    parsedTransactions.forEach((parsedTransaction) => {
      sqlValues.push(
        `('${parsedTransaction.hash}', ${transaction.blockNumber}, '${
          parsedTransaction.address
        }', '${transaction.timestamp}', '${JSON.stringify(parsedTransaction)}')`,
      );
    });
    return this.getInsertSql(sqlValues);
  }

  private getInsertSql(sqlValues: string[]): string {
    if (!sqlValues.length) {
      return '';
    }

    return `insert into transactions(hash, block_number, address, timestamp, transaction_data) 
        values ${sqlValues.join(',')}
        on conflict(hash, address) 
        do update set 
        block_number = EXCLUDED.block_number,
        timestamp = EXCLUDED.timestamp,
        transaction_data = EXCLUDED.transaction_data`;
  }

  private async getParsedTransfers(
    transaction: MigrationTransaction,
    uniqueAddresses: Set<string>,
    subTransactions: SubTransactions[],
  ): Promise<ParsedTransfers[]> {
    const parseTransactions: ParsedTransfersDto[] = [];

    for (const address of uniqueAddresses) {
      const addressSubTransactions = subTransactions.filter(
        (subTransaction) => address === subTransaction.address,
      );

      if (!addressSubTransactions?.length) {
        continue;
      }

      const from = addressSubTransactions.find((x) => x.type === TokenTypes.OUT);
      const to = addressSubTransactions.find((x) => x.type === TokenTypes.IN);
      const name = from
        ? to
          ? TokenOperations.EXCHANGE
          : TokenOperations.SEND
        : TokenOperations.RECEIVE;

      const parsedTransfer = new ParsedTransfersDto();
      parsedTransfer.address = address;
      parsedTransfer.gas = transaction.gas;
      parsedTransfer.gasPrice = transaction.gasPrice;
      parsedTransfer.hash = transaction.hash;
      parsedTransfer.name = name;
      parsedTransfer.subTransactions = addressSubTransactions;

      parseTransactions.push(parsedTransfer);
    }
    return parseTransactions;
  }

  private async getArrayOfSubTransactions(
    events: MigrationEvent[],
    transaction: MigrationTransaction,
  ): Promise<SubTransactions[]> {
    const subTransactions: SubTransactionDto[] = [];
    const tokenAddresses = new Set(events.map((event) => event.address));

    const requestAssets = Array.from(tokenAddresses).map((token) => {
      return {
        address: token,
        timestamps: [Number(transaction.timestamp)],
      };
    });

    const assetsPrices = await this.priceService.getHistoricalPrices(requestAssets, CHAIN_ID_ETH);

    const assetsEntities: AssetsNewEntity[] = await this.assetsNewRepository.find({
      where: { address: In(Array.from(tokenAddresses)) },
    });

    for (const item of events) {
      const currentAssetEntity = assetsEntities.find((asset) => asset.address === item.address);
      if (item?.data === ZERO_DATA || !currentAssetEntity) {
        continue;
      }

      if (!assetsPrices) {
        throw Error('Price-service is not working correctly!');
      }

      currentAssetEntity.price =
        assetsPrices.prices[currentAssetEntity.address][transaction.timestamp];

      TransactionsParsingService.getSubTransactions(
        currentAssetEntity,
        item,
        TokenTypes.IN, //'incoming',
        subTransactions,
        transaction,
      );
      TransactionsParsingService.getSubTransactions(
        currentAssetEntity,
        item,
        TokenTypes.OUT, //'outgoing',
        subTransactions,
        transaction,
      );
    }
    return subTransactions;
  }

  private static getSubTransactions(
    asset: AssetsNewEntity,
    event: MigrationEvent,
    type: string,
    subTransactions: SubTransactions[],
    transaction: MigrationTransaction,
  ): void {
    if (!event || !asset) {
      return;
    }

    const subTransaction = new SubTransactionDto();
    subTransaction.address = type === TokenTypes.OUT ? event.topic2 : event.topic3;
    subTransaction.amount = TransactionsParsingService.fromHexToNumber(
      event.data,
      asset.decimals || 18,
    );
    subTransaction.gasUsed = transaction.gasUsed;
    subTransaction.gasUsedUsd = transaction.gasUsedUsd;
    subTransaction.price = asset.price;
    subTransaction.symbol = asset.symbol;
    subTransaction.tokenAddress = asset.address;
    subTransaction.type = type;

    if (subTransaction.address) {
      subTransactions.push(subTransaction);
    }
  }

  private getModifiedTransactionTransfers(
    transaction: MigrationTransaction,
    uniqueAddresses: Set<string>,
  ): MigrationEvent[] {
    const transactionTransfers: MigrationEvent[] = [];
    transaction.events.forEach((event) => {
      if (event.topic1 === ETH_TRANSFER_TOPIC) {
        const temporaryEvent: MigrationEvent = JSON.parse(JSON.stringify(event));
        temporaryEvent.topic2 = TransactionsParsingService.fromHexToAddress(temporaryEvent.topic2);
        temporaryEvent.topic3 = TransactionsParsingService.fromHexToAddress(temporaryEvent.topic3);
        temporaryEvent.address = temporaryEvent.address.toLowerCase();
        TransactionsParsingService.addToSetAddress(temporaryEvent.topic2, uniqueAddresses);
        TransactionsParsingService.addToSetAddress(temporaryEvent.topic3, uniqueAddresses);
        transactionTransfers.push(temporaryEvent);
      }
    });
    return transactionTransfers;
  }

  private async modifyTransaction(transaction: MigrationTransaction): Promise<void> {
    const asset = {
      address: ETH_ADDRESS,
      timestamps: [Number(transaction.timestamp)],
    };
    const [{ gasUsed }, priceResponse] = await Promise.all([
      this.ethProvider.eth.getTransactionReceipt(transaction.hash),
      this.priceService.getHistoricalPrices([asset], CHAIN_ID_ETH),
    ]);

    if (!priceResponse) {
      throw Error('Price-service is not working correctly!');
    }

    transaction.gasUsed = gasUsed;
    transaction.gasUsedUsd = new BN(gasUsed)
      .times(transaction.gasPrice)
      .div(decimalsDivider(18))
      .times(priceResponse.prices[ETH_ADDRESS][Number(transaction.timestamp)])
      .toNumber();
  }

  private static getEthTransactionTransfer(transaction: MigrationTransaction): MigrationEvent {
    return plainToClass(EventDto, transaction, { excludeExtraneousValues: true });
  }

  public static fromHexToAddress(topic: string): string {
    return topic
      ? topic
          .substring(0, 2)
          .concat(topic.substring(26)) //
          .toLowerCase()
      : null;
  }

  private static fromHexToNumber(hexData: string, decimals: number): string {
    return new BN(Web3.utils.toBN(hexData).toString()) //
      .div(decimalsDivider(decimals))
      .toString();
  }

  private static addToSetAddress(topic: string, uniqueAddresses: Set<string>): void {
    if (topic) {
      uniqueAddresses.add(topic);
    }
  }
}
