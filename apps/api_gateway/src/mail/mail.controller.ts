import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import {
  HireEmailRequestDto,
  EmailResponseDto,
  HireEmailValidationErrorResponseDto,
} from './mail.dto';
import { MailService } from './mail.service';

@ApiTags('Hire')
@Controller('mail')
export class MailController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly hireService: MailService,
  ) {}

  @Post('/hire')
  @ApiCreatedResponse({ type: EmailResponseDto }) // 201
  @ApiBadRequestResponse({ type: HireEmailValidationErrorResponseDto }) // 400
  sendHireMail(@Body() request: HireEmailRequestDto): Promise<any> {
    try {
      const { email, name, letter } = request;
      return this.hireService.sendHireMail(email, name, letter);
    } catch (e) {
      this.logger.error(e, 'MailController sendHireMail');
      throw e;
    }
  }

  @Post('/question')
  @ApiCreatedResponse({ type: EmailResponseDto }) // 201
  @ApiBadRequestResponse({ type: HireEmailValidationErrorResponseDto }) // 400
  sendQuestionMail(@Body() request: HireEmailRequestDto): Promise<any> {
    try {
      const { email, name, letter } = request;
      return this.hireService.sendQuestionMail(email, name, letter);
    } catch (e) {
      this.logger.error(e, 'MailController sendHireMail');
      throw e;
    }
  }
}
