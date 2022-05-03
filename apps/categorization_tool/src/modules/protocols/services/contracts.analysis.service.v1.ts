import { eachLimit, doWhilst } from 'async';
import { detailedDiff } from 'deep-object-diff';
import * as stringSimilarity from 'string-similarity';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { safeJsonParse } from '../../../utils';
import { Contract } from '../../database/entities/contract.entity';
import { ContractsAnalysisRepository } from '../../database/repositories/contracts.analysis.repo';
import { ContractsRepository } from '../../database/repositories/contracts.repo';
import { ProtocolsRepository } from '../../database/repositories/protocols.repo';
import { ANALYSE_CONTRACTS_PARALLEL_LIMIT } from '../protocols.constant';
import { AbiCompoundTemplate } from './abi/abi.compound.template';
import { AbiMasterchefTemplate } from './abi/abi.masterchef.template';

@Injectable()
export class ContractsAnalysisServiceV1 {
  readonly abiTemplates: Map<number, any>;
  readonly contractsFetchLimit = 50;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectRepository(ContractsRepository)
    private readonly contractsRepository: ContractsRepository,
    @InjectRepository(ContractsAnalysisRepository)
    private readonly contractAnalysisRepository: ContractsAnalysisRepository,
    @InjectRepository(ProtocolsRepository)
    private readonly protocolsRepository: ProtocolsRepository,
  ) {
    this.abiTemplates = new Map<number, any>([
      [AbiMasterchefTemplate.id, AbiMasterchefTemplate],
      [AbiCompoundTemplate.id, AbiCompoundTemplate],
    ]);
  }

  async analyseContracts(): Promise<void> {
    this.logger.log('analyseContracts started');
    let skip = 0;
    await doWhilst(
      async () => this.getContractsWithValidAbi(skip),
      async ({ taken, contracts }) => {
        await eachLimit(
          contracts,
          ANALYSE_CONTRACTS_PARALLEL_LIMIT,
          this.analyseContract.bind(this),
        );
        skip += taken;
        this.logger.debug(`analysed [${skip}] contracts`);
        return !!contracts.length;
      },
    );
    this.logger.log('analyseContracts finished');
  }

  async analyseContract(contract: Contract): Promise<void> {
    this.logger.debug(`analysing contract: [${contract.address}]`);
    let skip = 0;
    await doWhilst(
      async () => this.getContractsWithValidAbi(skip),
      async ({ taken, contracts }) => {
        await this.processContractAnalysis(contract, contracts);
        skip += taken;
        return !!contracts.length;
      },
    );
  }

  async processContractAnalysis(contract: Contract, contracts: Contract[]): Promise<void> {
    const parsedContractAbi = JSON.parse(contract.abi);
    for (const counterpartContract of contracts) {
      if (contract.id === counterpartContract.id) continue;
      try {
        const { abiCodeSimilarity, abiJsonDiff, abiJsonSimilarity } =
          await this.analyseAbiAndAbiCode(contract.abiCode, counterpartContract, parsedContractAbi);

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
  }

  private async analyseAbiAndAbiCode(
    abiCode: string,
    counterpartContract: Contract,
    parsedContractAbi: any,
  ): Promise<{ abiCodeSimilarity: number; abiJsonSimilarity: number; abiJsonDiff: any }> {
    const abiCodeSimilarity = this.analyseAbiCode(abiCode, counterpartContract);
    const parsedCounterpartContractAbi = JSON.parse(counterpartContract.abi);
    const [abiJsonSimilarity, abiJsonDiff] = this.analyseAbi(
      parsedContractAbi,
      parsedCounterpartContractAbi,
    );
    return {
      abiCodeSimilarity,
      abiJsonSimilarity,
      abiJsonDiff,
    };
  }

  private analyseAbiCode(abiCode: string, counterpartContract: Contract): number {
    return stringSimilarity.compareTwoStrings(abiCode, counterpartContract.abiCode);
  }

  private async getContractsWithValidAbi(
    skip?: number,
    take = this.contractsFetchLimit,
  ): Promise<{ taken: number; contracts: Contract[] }> {
    const fetchedContracts = await this.contractsRepository.findAllWithAbiAndAbiCode(skip, take);
    return {
      taken: fetchedContracts.length,
      contracts: fetchedContracts.filter(({ abi }) => safeJsonParse(abi)),
    };
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
      (r, k) => (o[k] && typeof o[k] === 'object' ? r + this.count(o[k]) : r + 1),
      0,
    );
  }
}
