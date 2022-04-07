import parallelLimit from 'async/parallelLimit';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Protocol } from '../../database/entities/protocol.entity';
import { ContractsRepository } from '../../database/repositories/contracts.repo';
import { ProtocolsRepository } from '../../database/repositories/protocols.repo';
import { IListContract } from '../interfaces/protocol.interface';
import {
  FETCH_ABI_PARALLEL_LIMIT,
  PROTOCOL_LINKS_PROCESS_PARALLEL_LIMIT,
} from '../protocols.constant';
import { GeneralPageParsing } from '../strategies/contract';
import { AbiFetcherService } from './abi/fetcher/abi.fetcher.service';

@Injectable()
export class ContractsService {
  readonly testRun: boolean;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectRepository(ProtocolsRepository) private readonly protocolsRepo: ProtocolsRepository,
    @InjectRepository(ContractsRepository)
    private readonly contractsRepository: ContractsRepository,
    private readonly generalParsingPage: GeneralPageParsing,
    private readonly abiFetcherService: AbiFetcherService,
    private readonly configService: ConfigService,
  ) {
    this.testRun = JSON.parse(configService.get('TEST_RUN'));
  }

  async scanWebsitesForContracts(websites: { url: string; protocol: Protocol }[]): Promise<void> {
    this.logger.log('scanWebsitesForContracts started');
    await parallelLimit(
      websites.map(({ url, protocol }) => async () => {
        try {
          this.logger.debug(`parse url: [${url}]`);
          const resultParsing = await this.generalParsingPage.parsing({ url });
          const contracts = resultParsing.map((address) => ({ address, protocol }));
          await this.saveContracts(contracts);
        } catch (e) {
          this.logger.error(`Parsing page [${url}], error [${e.message}]`);
        }
      }),
      PROTOCOL_LINKS_PROCESS_PARALLEL_LIMIT,
    );
    this.logger.log('scanWebsitesForContracts finished');
  }

  private async saveContracts(listContracts: IListContract[]) {
    const find = await this.contractsRepository.find({
      where: listContracts.map((a) => ({ address: a?.address, protocol: a?.protocol })),
    });

    const sortByAddress = new Map(find.map((f) => [f.address, f]));

    const filteredAddresses = listContracts?.filter((a) => !sortByAddress.has(a?.address));

    await this.contractsRepository.save(filteredAddresses);
  }

  async fetchAbiAndAbiCode() {
    const allContracts = await this.contractsRepository.findWithoutAbiOrAbiCode();
    const contracts = this.testRun ? allContracts.slice(0, 50) : allContracts;
    await parallelLimit(
      contracts.map(({ id, address }) => async () => {
        //fetch ABI and ABI Code
        this.logger.debug(`fetchAbiAndAbiCode for address: ${address}`);
        const { abi, abiCode } = await this.abiFetcherService.fetchAbiAndAbiCode(address);

        //update DB info
        await this.contractsRepository.update({ id }, { abi, abiCode });
      }),
      FETCH_ABI_PARALLEL_LIMIT,
    );
  }
}
