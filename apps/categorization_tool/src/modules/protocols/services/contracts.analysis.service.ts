import { parallelLimit } from 'async';
import { detailedDiff } from 'deep-object-diff';
import * as stringSimilarity from 'string-similarity';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { safeJsonParse } from '../../../utils';
import { Contract } from '../../database/entities/contract.entity';
import { ContractsAnalysisRepository } from '../../database/repositories/contracts.analysis.repo';
import { ContractsRepository } from '../../database/repositories/contracts.repo';
import { ANALYSE_CONTRACTS_PARALLEL_LIMIT } from '../protocols.constant';
import { AbiMasterchefTemplate } from './abi/abi.masterchef.template';

@Injectable()
export class ContractsAnalysisService {
  readonly abiTemplates: Map<number, any>;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectRepository(ContractsRepository)
    private readonly contractsRepository: ContractsRepository,
    @InjectRepository(ContractsAnalysisRepository)
    private readonly contractAnalysisRepository: ContractsAnalysisRepository,
  ) {
    this.abiTemplates = new Map<number, any>([[AbiMasterchefTemplate.id, AbiMasterchefTemplate]]);
  }

  async analyzeContractsAgainstTemplates(): Promise<void> {
    this.logger.log('analyzeContractsWithTemplates started');
    const templates = await this.contractsRepository.findTemplates();
    if (!templates.length) {
      this.logger.log('no templates found in DB, finishing..');
      return;
    }
    const contracts = await this.getContractsWithValidAbi();
    await parallelLimit(
      contracts.map((contract) => async () => {
        const parsedContractAbi = JSON.parse(contract.abi);
        for (const tContract of templates) {
          this.logger.debug(`analyse contracts: [${tContract.address}]-[${contract.address}]`);
          try {
            const abiCodeSimilarity = stringSimilarity.compareTwoStrings(
              tContract.abiCode,
              contract.abiCode,
            );
            const tContractAbi = JSON.parse(tContract.abi);
            const functionPredicates = this.getTemplateFunctionPredicates(tContract);
            const tAbi = this.extractAbiByPredicates(tContractAbi, functionPredicates);
            const abi = this.extractAbiByPredicates(parsedContractAbi, functionPredicates);
            const [abiJsonSimilarity, abiJsonDiff] = this.analyseAbiAgainstTemplate(tAbi, abi);
            await this.contractAnalysisRepository.upsertContractAnalysis(
              tContract,
              contract,
              abiCodeSimilarity,
              abiJsonSimilarity,
              abiJsonDiff,
            );
          } catch (e) {
            this.logger.warn(
              `analyseContracts error - [${contract.address}], [${tContract.address}]: ${e.stack}`,
            );
          }
        }
      }),
      ANALYSE_CONTRACTS_PARALLEL_LIMIT,
    );
    this.logger.log('analyzeContractsWithTemplates finished');
  }

  async analyseContracts(): Promise<void> {
    this.logger.log('analyseContracts started');
    const contracts = await this.getContractsWithValidAbi();
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

  private async getContractsWithValidAbi() {
    return (await this.contractsRepository.findAllWithAbiAndAbiCode()).filter(({ abi }) =>
      safeJsonParse(abi),
    );
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

  private getTemplateFunctionPredicates(templateContract: Contract) {
    return this.abiTemplates.get(templateContract.id)?.functionPredicates;
  }

  private extractAbiByPredicates(abi: object[], functionPredicates: any) {
    if (!functionPredicates) {
      return abi;
    }
    return functionPredicates.map(({ predicate, modifier }) => {
      const foundItem = abi.find((item) => predicate(item)) || {};
      return modifier ? modifier(foundItem) : foundItem;
    });
  }

  private analyseAbiAgainstTemplate(tAbi, abi): [number, object] {
    const abiJsonDiff = detailedDiff(tAbi, abi) as {
      deleted: object;
      updated: object;
    };
    const diffCount = this.count(abiJsonDiff.deleted) + this.count(abiJsonDiff.updated);
    const totalFieldsCount = this.count(tAbi);
    const abiJsonSimilarity = 1 - diffCount / totalFieldsCount;
    return [abiJsonSimilarity, abiJsonDiff];
  }

  private count(o: object): number {
    return Object.keys(o).reduce(
      (r, k) => (o[k] && typeof o[k] === 'object' ? r + this.count(o[k]) : r + 1),
      0,
    );
  }
}
