import { Between, getManager, In, Not, Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CHAIN_ID_ETH } from '../util/util';
import { EthBlockEntity } from './entities/eth.block.entity';
import { EthEventsEntity } from './entities/eth.events.entity';
import { EthTransactionsEntity } from './entities/eth.transactions.entity';
import { TransactionNewEntity } from './entities/transaction.new.entity';
import { ParsingService } from './parsing.service';

@Injectable()
export class TransactionFixService {
  constructor(
    @InjectRepository(TransactionNewEntity)
    private readonly transactionNewRepository: Repository<TransactionNewEntity>,
    @InjectRepository(EthTransactionsEntity)
    private readonly ethTransactionRepository: Repository<EthTransactionsEntity>,
    @InjectRepository(EthEventsEntity)
    private readonly ethEventsRepository: Repository<EthEventsEntity>,
    @InjectRepository(EthBlockEntity)
    private readonly ethBlockRepository: Repository<EthBlockEntity>,
    private readonly parsingService: ParsingService,
  ) {}

  async fixTransactions(fromBlock: number, toBlock: number): Promise<void> {
    const [ethTransactions, ethBlocks] = await Promise.all([
      this.ethTransactionRepository.find({
        blockNumber: Between(fromBlock, toBlock),
        value: Not(0),
      }),
      this.ethBlockRepository.find({ number: Between(fromBlock, toBlock) }),
    ]);

    const transactionHash: string[] = ethTransactions.map((transaction) => transaction.hash);
    const [events, newTransactions] = await Promise.all([
      this.ethEventsRepository.find({ where: { transactionHash: In(transactionHash) } }),
      getManager()
        .getRepository(TransactionNewEntity)
        .createQueryBuilder()
        .distinctOn(['hash'])
        .where('hash IN (:...hashes)', { hashes: transactionHash })
        .getMany(),
    ]);

    const eventsMap: Map<EthEventsEntity['transactionHash'], EthEventsEntity[]> = new Map();
    events.forEach((event) => {
      const temporary = eventsMap.get(event.transactionHash);
      temporary ? temporary.push(event) : eventsMap.set(event.transactionHash, [event]);
    });

    const sqlStings: string[] = [];
    await Promise.all(
      ethTransactions.map(async (transaction) => {
        const transactionEvents = eventsMap.get(transaction.hash);
        // i had done this check because in our consumer we were adding subTransaction when events.length == 0 and value!=0
        // so our new_transactions which don't have events are right
        if (transactionEvents?.length) {
          transaction.events = eventsMap.get(transaction.hash);
          transaction.chainId = CHAIN_ID_ETH;
          transaction.timestamp = ethBlocks.find(
            (block) => block.number === transaction.blockNumber,
          )?.timestamp;
          sqlStings.push(
            ...(await this.parsingService.parseTransactions(transaction, newTransactions)),
          );
        }
      }),
    );
    const insertSql = ParsingService.getInsertSql(sqlStings);
    await getManager().query(insertSql);
  }
}
