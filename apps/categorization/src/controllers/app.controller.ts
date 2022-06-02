import { Body, Controller, Get, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { CommandRequestDto } from '../common/dto/command.request.dto';
import { ContractAnalyseRequestDto } from '../common/dto/contract.analyse.request.dto';
import { ContractSimilarRequestDto } from '../common/dto/contract.similar.request.dto';
import { ContractSimilarResponseDto } from '../common/dto/contract.similar.response.dto';
import { ProtocolAnalyseRequestDto } from '../common/dto/protocol.analyse.request.dto';

import { ContractsAnalysisServiceV1 } from '../modules/protocols/services/contracts.analysis.service.v1';
import { TasksService } from '../modules/tasks/tasks.service';

@ApiTags('Categorization Service')
@Controller('')
export class AppController {
  constructor(
    private readonly service: TasksService,
    private readonly contractsAnalysisServiceV1: ContractsAnalysisServiceV1,
  ) {}

  @Post('/command')
  @ApiResponse({ status: HttpStatus.OK })
  async runCommand(@Query() request: CommandRequestDto) {
    return this.service.queueTask(request);
  }

  @Get('/contract/similar')
  @ApiResponse({ status: HttpStatus.OK, type: ContractSimilarResponseDto })
  async getSimilarContracts(@Query() request: ContractSimilarRequestDto) {
    return this.contractsAnalysisServiceV1.getSimilarContracts(request);
  }

  @Post('/contract/analyse')
  @ApiResponse({ status: HttpStatus.OK })
  async contractAnalyse(@Body() request: ContractAnalyseRequestDto) {
    return this.service.queueTask(request);
  }

  @Post('/protocol/analyse')
  @ApiResponse({ status: HttpStatus.OK })
  async parsingProtocolPost(@Body() request: ProtocolAnalyseRequestDto) {
    return this.service.queueTask(request);
  }
}
