import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiQuery } from '@nestjs/swagger';

import { ListProtocolsDTO } from '../common/dto/service.dto';
import { SimilarDTO } from '../common/dto/similar.dto';
import { CommandParameterized, CommandUnparameterized } from '../common/enum/service.enum';

import { ContractsAnalysisService } from '../modules/protocols/services/contracts.analysis.service';
import { TasksService } from '../modules/tasks/tasks.service';

@Controller('')
export class AppController {
  constructor(
    private readonly service: TasksService,
    private readonly contractsAnalysisService: ContractsAnalysisService,
  ) {}

  @Get('/command')
  @ApiQuery({ name: 'command', enum: CommandUnparameterized })
  public async aggregatorsParse(
    @Query('command') command: CommandUnparameterized = CommandUnparameterized.start_fetching,
  ) {
    return this.service.queueTask({ command });
  }

  @Post('/website/protocol')
  @ApiBody({ type: ListProtocolsDTO })
  public async parsingProtocolPost(@Body() listProtocol: ListProtocolsDTO) {
    return this.service.queueTask({
      command: CommandParameterized.run_parsing_custom_protocol,
      listProtocol,
    });
  }

  @Get('/requests/similar-contract')
  @ApiQuery({ name: 'contract' })
  @ApiQuery({ name: 'minSimilarityRate' })
  public async getSimilarContracts(
    @Query() similarData: { contract: string; minSimilarityRate: number },
  ) {
    return await this.contractsAnalysisService.getSimilarForContractAddress(similarData);
  }

  @Post('/requests/similar-contract')
  @ApiBody({ type: SimilarDTO })
  public async similarContracts(@Body() similarData: { contract: string }) {
    return this.service.queueTask({ command: 'similar_contract', similarData });
  }

  @Get('/v1/status')
  public async status() {
    return {
      status: 'OK',
    };
  }
}
