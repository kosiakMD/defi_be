import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';

import { CommandDTO } from '../common/dto/command.dto';
import { ListProtocolsDTO } from '../common/dto/service.dto';
import { Command } from '../common/enum/service.enum';

import { IListProtocol } from '../modules/protocols/interfaces/protocol.interface';
import { TasksService } from '../modules/tasks/tasks.service';

@Controller('')
export class AppController {
  constructor(private readonly service: TasksService) {}

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
}
