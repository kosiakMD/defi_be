/* eslint-disable @typescript-eslint/ban-ts-comment */
import { plainToClass } from 'class-transformer';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { In, Repository } from 'typeorm';
import { EntityManager } from 'typeorm/entity-manager/EntityManager';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { ChainIdEnum, ResultStatus } from 'src/common/enum';
import { Address, DetailedResponse } from 'src/common/interfaces';

import { BlacklistService } from '../blacklist/blacklist.service';
import { Web3Provider } from '../chain/web3.provider';
import { CovalentService } from '../covalent/covalent.service';
import { excludeSecondArray } from '../utils/utils';
import { TransactionNewDto } from './dto/transaction.dto';
import { TransactionNewEntity } from './entity/transaction.new.entity';

@Injectable()
export class TransactionsService {
  addresses: string;
  addressesArray: Address[];
  manager: EntityManager;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
    private readonly web3Provider: Web3Provider,
    private readonly covalentService: CovalentService,
    @InjectRepository(TransactionNewEntity)
    private readonly transactionRepository: Repository<TransactionNewEntity>,
    private readonly blacklistService: BlacklistService,
  ) {}

  public async getTransactionsNew(
    addresses: Address[],
    chains: ChainIdEnum[],
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
      const dbTsxNew: TransactionNewEntity[] = await this.transactionRepository.find({
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
}
