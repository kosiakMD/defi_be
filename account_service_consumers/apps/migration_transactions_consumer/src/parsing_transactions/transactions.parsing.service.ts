import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BigNumber as BN } from 'bignumber.js';
import { plainToClass } from 'class-transformer';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { getManager, In, Repository } from 'typeorm';
import Web3 from 'web3';

import { Web3Provider } from '../chain/web3.provider';
import { Logger } from '../logger/logger.service';
import { CurrentPrices, PriceResponseDto } from '../price/dto/price.response.dto';
import { PriceService } from '../price/price.service';
import {
  CHAIN_ID_ETH,
  DB_BLOCK_FROM,
  DB_BLOCK_TO,
  decimalsDivider,
  ETH_ADDRESS,
  ETH_TRANSFER_TOPIC,
  fromHexToAddress,
  ZERO_DATA,
} from '../util/util';
import { EventDto } from './dto/event.dto';
import { SubTransactionDto } from './dto/sub.transaction.dto';
import { AssetsNewEntity } from './entities/assets.new.entity';
import { TransactionsEntity } from './entities/transactions.entity';
import { TokenOperations } from './enums/token.operations';
import { TokenTypes } from './enums/token.types';
import {
  MigrationEvent,
  MigrationTransaction,
  SubTransactions,
} from './transactions.parsing.interfaces';

@Injectable()
export class TransactionsParsingService {
  private readonly ethProvider: Web3;
  constructor(
    @InjectRepository(AssetsNewEntity)
    private assetsNewRepository: Repository<AssetsNewEntity>,
    @InjectRepository(TransactionsEntity)
    private transactionRepository: Repository<TransactionsEntity>,
    private priceService: PriceService,
    private web3Provider: Web3Provider,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.ethProvider = web3Provider.instanceEth();
  }

  async parseTransactions(transaction: MigrationTransaction): Promise<void> {
    const uniqueAddresses: Set<string> = new Set();

    const transactionTransfers: MigrationEvent[] = this.getModifiedTransactionTransfers(
      transaction,
      uniqueAddresses,
    );

    if (Number(transaction.value)) {
      TransactionsParsingService.addToSetAddress(transaction.from?.toLowerCase(), uniqueAddresses);
      TransactionsParsingService.addToSetAddress(transaction.to?.toLowerCase(), uniqueAddresses);
      transactionTransfers.push(TransactionsParsingService.getEthTransactionTransfer(transaction));
    }

    const subTransactions = await this.getArrayOfSubTransactions(transactionTransfers, transaction);
    const parsedTransfers: string = await this.getInsertSqlString(
      transaction,
      uniqueAddresses,
      subTransactions,
    );
    await getManager().query(parsedTransfers);
    return;
  }

  private getInsertSqlString(
    transaction: MigrationTransaction,
    uniqueAddresses: Set<string>,
    subTransactions: SubTransactions[],
  ): string {
    const sqlData: string[] = [];
    for (const address of uniqueAddresses) {
      const addressSubTransactions = subTransactions.filter(
        (subTransaction) => address === subTransaction.address,
      );

      const from = addressSubTransactions.find((x) => x.type === TokenTypes.OUT);
      const to = addressSubTransactions.find((x) => x.type === TokenTypes.IN);
      const tokenOperation = from
        ? to
          ? TokenOperations.EXCHANGE
          : TokenOperations.SEND
        : TokenOperations.RECEIVE;

      sqlData.push(
        `('${transaction.hash}', '${address}', ${transaction.blockNumber}, '${
          transaction.timestamp
        }', '${transaction.from}', '${transaction?.to}', '${transaction.gasPrice}', ${
          transaction.gasUsed
        }, ${transaction.gasUsedUsd}, '${tokenOperation}', ${transaction.chainId || CHAIN_ID_ETH}, 
        ${Boolean(addressSubTransactions?.length)}, 
        '${JSON.stringify(addressSubTransactions).replace("'", "''")}')`,
      );
    }
    return this.getInsertSql(sqlData);
  }

  private getInsertSql(sqlValues: string[]): string {
    if (!sqlValues.length) {
      return '';
    }

    return `insert into transactions_new(hash, address, block_number, timestamp, sender, destination, gas_price, gas_used, fee_usd, token_operation, chain_id, is_visible, sub_transactions) 
        values ${sqlValues.join(',')}
        on conflict(hash, address) 
        do update set 
        block_number = EXCLUDED.block_number,
        timestamp = EXCLUDED.timestamp,
        sender = EXCLUDED.sender,
        destination = EXCLUDED.destination,
        gas_price = EXCLUDED.gas_price,
        gas_used = EXCLUDED.gas_used,
        fee_usd = EXCLUDED.fee_usd,
        token_operation = EXCLUDED.token_operation,
        chain_id = EXCLUDED.chain_id,
        is_visible = EXCLUDED.is_visible,
        sub_transactions = EXCLUDED.sub_transactions`;
  }

  private async getAssetsPricesAndModifyTransaction(
    transaction: MigrationTransaction,
    tokenAddresses: Set<string>,
  ): Promise<PriceResponseDto<CurrentPrices>> {
    const requestAssets = Array.from(tokenAddresses).map((token) => {
      return {
        address: token,
        timestamps: [Number(transaction.timestamp)],
      };
    });

    const assetsPrices = await this.priceService.getHistoricalPrices(requestAssets, CHAIN_ID_ETH);
    let gasUsed;
    if (transaction.blockNumber >= DB_BLOCK_FROM && transaction.blockNumber <= DB_BLOCK_TO) {
      const dbTransaction = await this.transactionRepository.findOne({ hash: transaction.hash });
      const dbGasUsed = dbTransaction?.transactionData?.subTransactions[0]?.gasUsed;
      gasUsed = dbGasUsed ? dbGasUsed : await this.getGasUsedFromWeb3(transaction.hash);
    } else {
      gasUsed = await this.getGasUsedFromWeb3(transaction.hash);
    }

    this.modifyTransaction(
      transaction,
      assetsPrices.prices[ETH_ADDRESS][transaction.timestamp],
      gasUsed,
    );

    return assetsPrices;
  }

  private async getGasUsedFromWeb3(hash: string): Promise<number> {
    try {
      const timeMark = `Request to web3 - getting of gasUsed for transaction: ${hash}`;
      this.logger.time(timeMark);
      const { gasUsed } = await this.ethProvider.eth.getTransactionReceipt(hash);
      this.logger.timeEnd(timeMark);
      return gasUsed;
    } catch (e) {
      this.logger.error(e, 'getGasUsedFromWeb3');
      throw e;
    }
  }

  private async getArrayOfSubTransactions(
    events: MigrationEvent[],
    transaction: MigrationTransaction,
  ): Promise<SubTransactions[]> {
    const subTransactions: SubTransactionDto[] = [];
    const tokenAddresses = new Set(events.map((event) => event.address));
    tokenAddresses.add(ETH_ADDRESS);

    const assetsPrices = await this.getAssetsPricesAndModifyTransaction(
      transaction,
      tokenAddresses,
    );
    const timeMark = `Request to DB - getting of data from assets_new table`;
    this.logger.time(timeMark);
    const assetsEntities: AssetsNewEntity[] = await this.assetsNewRepository.find({
      where: { address: In(Array.from(tokenAddresses)), chain: CHAIN_ID_ETH },
    });
    this.logger.timeEnd(timeMark);

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
      );
      TransactionsParsingService.getSubTransactions(
        currentAssetEntity,
        item,
        TokenTypes.OUT, //'outgoing',
        subTransactions,
      );
    }
    return subTransactions;
  }

  private static getSubTransactions(
    asset: AssetsNewEntity,
    event: MigrationEvent,
    type: string,
    subTransactions: SubTransactions[],
  ): void {
    if (!asset || !asset.isDataPresent) {
      throw Error('GetSubTransaction method - incorrect data for AssetsNewEntity object!');
    }

    const subTransaction = new SubTransactionDto();
    subTransaction.address = type === TokenTypes.OUT ? event.topic2 : event.topic3;
    subTransaction.amount = TransactionsParsingService.fromHexToNumber(event.data, asset.decimals);

    subTransaction.price = asset.price;
    subTransaction.symbol = asset.symbol;
    subTransaction.tokenAddress = asset.address;
    subTransaction.decimals = asset.decimals;
    subTransaction.from = event?.topic2 || null;
    subTransaction.to = event?.topic3 || null;
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
    transaction?.events?.forEach((event) => {
      if (event.topic1 === ETH_TRANSFER_TOPIC) {
        const temporaryEvent: MigrationEvent = JSON.parse(JSON.stringify(event));
        temporaryEvent.topic2 = fromHexToAddress(temporaryEvent.topic2);
        temporaryEvent.topic3 = fromHexToAddress(temporaryEvent.topic3);
        temporaryEvent.address = temporaryEvent.address.toLowerCase();
        TransactionsParsingService.addToSetAddress(temporaryEvent.topic2, uniqueAddresses);
        TransactionsParsingService.addToSetAddress(temporaryEvent.topic3, uniqueAddresses);
        transactionTransfers.push(temporaryEvent);
      }
    });
    return transactionTransfers;
  }

  private modifyTransaction(
    transaction: MigrationTransaction,
    ethPrice: number,
    gasUsed: number,
  ): void {
    if (!ethPrice) {
      throw Error('Price-service is not working correctly!');
    }

    transaction.from = transaction?.from?.toLowerCase();
    transaction.to = transaction?.to?.toLowerCase();
    transaction.gasUsed = gasUsed;
    transaction.gasUsedUsd = new BN(gasUsed)
      .times(transaction.gasPrice)
      .div(decimalsDivider(18))
      .times(ethPrice)
      .toNumber();
  }

  private static getEthTransactionTransfer(transaction: MigrationTransaction): MigrationEvent {
    return plainToClass(EventDto, transaction, { excludeExtraneousValues: true });
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
