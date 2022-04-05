import { parallelLimit } from 'async';
import * as stringSimilarity from 'string-similarity';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ContractsAnalysisRepository } from '../../database/repositories/contracts.analysis.repo';
import { ContractsRepository } from '../../database/repositories/contracts.repo';
import { ANALYSE_CONTRACTS_PARALLEL_LIMIT } from '../protocols.constant';

@Injectable()
export class ContractsAnalysisService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectRepository(ContractsRepository)
    private readonly contractsRepository: ContractsRepository,
    @InjectRepository(ContractsAnalysisRepository)
    private readonly contractAnalysisRepository: ContractsAnalysisRepository,
  ) {}

  async analyseContracts(): Promise<void> {
    this.logger.log('analyseContracts started');
    const contracts = await this.contractsRepository.findAllWithAbiAndAbiCode();
    await parallelLimit(
      contracts.map((contract) => async () => {
        for (const counterpartContract of contracts) {
          if (contract.id === counterpartContract.id) continue;
          const similarity = stringSimilarity.compareTwoStrings(
            contract.abi,
            counterpartContract.abi,
          );
          await this.contractAnalysisRepository.upsertContractAnalysis(
            contract,
            counterpartContract,
            similarity,
          );
        }
      }),
      ANALYSE_CONTRACTS_PARALLEL_LIMIT,
    );
    this.logger.log('analyseContracts finished');
  }
}
