import parallelLimit from 'async/parallelLimit';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Protocol } from '../../database/entities/protocol.entity';
import { LinkTypeEnum } from '../../database/enum/link.type.enum';
import { ContractsRepository } from '../../database/repositories/contracts.repo';
import { ProtocolsRepository } from '../../database/repositories/protocols.repo';
import { IListContract } from '../interfaces/protocol.interface';
import {
  FETCH_ABI_PARALLEL_LIMIT,
  PROTOCOL_LINKS_PROCESS_PARALLEL_LIMIT,
  PROTOCOL_PROCESS_PARALLEL_LIMIT,
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
    this.testRun = configService.get('TEST_RUN');
  }

  async run(listProtocols: Protocol[]) {
    this.logger.debug('Run contract service !');
    const listContracts: IListContract[] = (
      await parallelLimit(
        listProtocols.map((p) => async () => {
          this.logger.debug(`protocol parse ${p.url}`);
          const arrayOfResponse = (
            await parallelLimit(
              p.links
                .filter((l) => l.type === LinkTypeEnum.DOCS)
                .flatMap((l) => async () => {
                  try {
                    const resultParsing = await this.generalParsingPage.parsing({ link: l });
                    return resultParsing;
                  } catch (e) {
                    this.logger.error(`Parsing page ${l.url} error ${e.message}`);
                  }
                }),
              PROTOCOL_LINKS_PROCESS_PARALLEL_LIMIT,
            )
          ).flat();

          return [...new Set(arrayOfResponse)]
            .map((a) => ({ address: a, protocol: p }))
            .filter((a) => a.address);
        }),
        PROTOCOL_PROCESS_PARALLEL_LIMIT,
      )
    ).flat();

    await this.saveContracts(listContracts);
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
        const { abi, abiCode } = await this.abiFetcherService.fetchAbiAndAbiCode(address);

        //update DB info
        await this.contractsRepository.update({ id }, { abi, abiCode });
      }),
      FETCH_ABI_PARALLEL_LIMIT,
    );
  }
}
