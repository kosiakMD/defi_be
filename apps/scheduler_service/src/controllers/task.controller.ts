import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { TaskCreateDto, TaskUpdateDto } from '../common/dtos/task.dto';
import { TaskIdParam, TaskInterface } from '../common/interfaces/task.interfaces';

import { TaskService } from '../modules/tasks/task.service';

@ApiTags('Tasks')
@Controller('v1/tasks')
export class TaskController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly taskService: TaskService,
  ) {}

  @Post()
  @ApiBody({ type: TaskCreateDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: TaskCreateDto })
  Store(@Body() body: TaskCreateDto): Promise<TaskInterface> {
    return this.taskService.store(body);
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK })
  // TODO: basic pagination
  List(@Query() query: any): Promise<any[]> {
    return this.taskService.search(query);
  }

  @Get(':id/trigger')
  @ApiParam({ type: Number, name: 'id' })
  @ApiResponse({ status: HttpStatus.OK })
  // TODO: basic pagination
  Trigger(@Param() params: TaskIdParam): Promise<TaskInterface[]> {
    const { id } = params;
    return this.taskService.trigger(id);
  }

  @Get(':id')
  @ApiParam({ type: Number, name: 'id' })
  @ApiResponse({ status: HttpStatus.OK })
  Find(@Param() params: TaskIdParam): Promise<TaskInterface> {
    const { id } = params;
    return this.taskService.find(id);
  }

  @Patch(':id')
  @ApiBody({ type: TaskUpdateDto })
  @ApiParam({ type: Number, name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: TaskUpdateDto })
  Update(@Param() params: TaskIdParam, @Body() body: TaskUpdateDto): Promise<TaskInterface> {
    const { id } = params;
    return this.taskService.update(id, body);
  }

  @Delete(':id')
  @ApiParam({ type: Number, name: 'id' })
  Destroy(@Param() params: TaskIdParam): Promise<boolean> {
    const { id } = params;
    return this.taskService.destroy(id);
  }
}
