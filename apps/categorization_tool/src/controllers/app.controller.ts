import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';

import { CommandDTO } from '../common/dto/command.dto';
import { ListProtocolsDTO } from '../common/dto/service.dto';
import { SimilarDTO } from '../common/dto/similar.dto';
import { Command } from '../common/enum/service.enum';

import { IListProtocol } from '../modules/protocols/interfaces/protocol.interface';
import { ContractsAnalysisService } from '../modules/protocols/services/contracts.analysis.service';
import { TasksService } from '../modules/tasks/tasks.service';

@Controller('')
export class AppController {
  constructor(
    private readonly service: TasksService,
    private readonly contractsAnalysisService: ContractsAnalysisService,
  ) {}

  @Post('/command')
  @ApiBody({ type: CommandDTO })
  public async aggregatorsParse(@Body() command: CommandDTO) {
    return this.service.queueTask(command);
  }

  @Post('/requests/link')
  @ApiBody({ type: [ListProtocolsDTO] })
  public async parsingProtocolPost(@Body() listProtocol: IListProtocol) {
    return this.service.queueTask({ command: Command.run_parsing_custom_protocol, listProtocol });
  }

  @Post('/requests/similar_contract')
  @ApiBody({ type: SimilarDTO })
  public async similarContracts(
    @Body() similarData: { contract: string; minSimilarityRate: number },
  ) {
    return await this.contractsAnalysisService.findSimilarAbiAndAbiCode(similarData);
  }

  @Get('/v1/status')
  public async status() {
    return {
      status: 'OK',
    };
  }
}
