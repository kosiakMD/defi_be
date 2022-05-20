import { Body, Controller, Get, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ContractAnalyseRequestDto } from '../common/dto/contract.analyse.request.dto';
import { ContractSimilarRequestDto } from '../common/dto/contract.similar.request.dto';
import { ContractSimilarResponseDto } from '../common/dto/contract.similar.response.dto';
import { ListProtocolsDTO } from '../common/dto/service.dto';
import { CommandParameterized, CommandUnparameterized } from '../common/enum/service.enum';

import { ContractsAnalysisServiceV1 } from '../modules/protocols/services/contracts.analysis.service.v1';
import { TasksService } from '../modules/tasks/tasks.service';

@ApiTags('Categorization Tool Service')
@Controller('')
export class AppController {
  constructor(
    private readonly service: TasksService,
    private readonly contractsAnalysisServiceV1: ContractsAnalysisServiceV1,
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

  @Get('/contract/similar')
  @ApiResponse({ status: HttpStatus.OK, type: ContractSimilarResponseDto })
  public async getSimilarContracts(@Query() request: ContractSimilarRequestDto) {
    return this.contractsAnalysisServiceV1.getSimilarContracts(request);
  }

  @Post('/contract/analyse')
  @ApiBody({ type: ContractAnalyseRequestDto })
  public async similarContracts(@Body() similarData: { contract: string }) {
    return this.service.queueTask({ command: CommandParameterized.similar_contract, similarData });
  }
}
