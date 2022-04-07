import { parallelLimit } from 'async';
import { detailedDiff } from 'deep-object-diff';
import * as stringSimilarity from 'string-similarity';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { safeJsonParse } from '../../../utils';
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
    const allContracts = await this.contractsRepository.findAllWithAbiAndAbiCode();
    //filter out those which has invalid ABI
    const contracts = allContracts.filter(({ abi }) => safeJsonParse(abi));
    await parallelLimit(
      contracts.map((contract) => async () => {
        const parsedContractAbi = JSON.parse(contract.abi);
        for (const counterpartContract of contracts) {
          if (contract.id === counterpartContract.id) continue;
          this.logger.debug(
            `analyse contracts: [${contract.address}]-[${counterpartContract.address}]`,
          );
          try {
            const abiCodeSimilarity = stringSimilarity.compareTwoStrings(
              contract.abiCode,
              counterpartContract.abiCode,
            );
            const parsedCounterpartContractAbi = JSON.parse(counterpartContract.abi);
            const [abiJsonSimilarity, abiJsonDiff] = this.analyseAbi(
              parsedContractAbi,
              parsedCounterpartContractAbi,
            );
            await this.contractAnalysisRepository.upsertContractAnalysis(
              contract,
              counterpartContract,
              abiCodeSimilarity,
              abiJsonSimilarity,
              abiJsonDiff,
            );
          } catch (e) {
            this.logger.warn(
              `analyseContracts error - [${contract.address}], [${counterpartContract.address}]: ${e.stack}`,
            );
          }
        }
      }),
      ANALYSE_CONTRACTS_PARALLEL_LIMIT,
    );
    this.logger.log('analyseContracts finished');
  }

  private analyseAbi(abi1, abi2): [number, object] {
    const abiJsonDiff = detailedDiff(abi1, abi2) as {
      added: object;
      deleted: object;
      updated: object;
    };
    const diffCount =
      this.count(abiJsonDiff.added) +
      this.count(abiJsonDiff.deleted) +
      this.count(abiJsonDiff.updated);
    const totalFieldsCount = this.count(abi1) + this.count(abi2);
    const abiJsonSimilarity = 1 - diffCount / totalFieldsCount;
    return [abiJsonSimilarity, abiJsonDiff];
  }

  private count(o: object): number {
    return Object.keys(o).reduce(
      (r, k) => (o[k] && typeof o[k] === 'object' ? r + 1 + this.count(o[k]) : r + 1),
      0,
    );
  }
}
