import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import {
  EmailResponseDto,
  HireEmailRequestDto,
  HireEmailValidationErrorResponseDto,
} from './dto/mail.dto';
import { MailService } from './mail.service';

@ApiTags('Hire')
@Controller('v1/mail')
export class MailController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly hireService: MailService,
  ) {}

  @Post('/hire')
  @ApiCreatedResponse({ type: EmailResponseDto })
  @ApiBadRequestResponse({ type: HireEmailValidationErrorResponseDto })
  sendHireMail(@Body() request: HireEmailRequestDto): Promise<any> {
    try {
      const { email, name, letter } = request;
      return this.hireService.sendHireMail(email, name, letter);
    } catch (e: any) {
      this.logger.error(e, 'MailController sendHireMail');
      throw e;
    }
  }

  @Post('/question')
  @ApiCreatedResponse({ type: EmailResponseDto })
  @ApiBadRequestResponse({ type: HireEmailValidationErrorResponseDto })
  sendQuestionMail(@Body() request: HireEmailRequestDto): Promise<any> {
    try {
      const { email, name, letter } = request;
      return this.hireService.sendQuestionMail(email, name, letter);
    } catch (e: any) {
      this.logger.error(e, 'MailController sendHireMail');
      throw e;
    }
  }
}
