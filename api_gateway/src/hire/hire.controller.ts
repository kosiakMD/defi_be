import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../common/Logger/Logger.service';
import {
  HireEmailRequestDto,
  HireEmailResponseDto,
  HireEmailValidationErrorResponseDto,
} from './hire.dto';
import { HireService } from './hire.service';

@ApiTags('Hire')
@Controller('hire')
export class HireController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly hireService: HireService,
  ) {}

  @Post('/mail')
  @ApiCreatedResponse({ type: HireEmailResponseDto }) // 201
  @ApiBadRequestResponse({ type: HireEmailValidationErrorResponseDto }) // 400
  sendMail(@Body() request: HireEmailRequestDto): Promise<any> {
    try {
      const { address, name, letter } = request;
      return this.hireService.sendHireMail(address, name, letter);
    } catch (e) {
      this.logger.error(e, 'HireController sendHireMail');
      throw e;
    }
  }
}
