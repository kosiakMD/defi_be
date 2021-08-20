import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { PartnerDto } from './dto';
import { PartnersService } from './partners.service';

@ApiTags('Partners')
@Controller('partners')
export class PartnersController {
  constructor(private partnersService: PartnersService) {}

  @Get('')
  @ApiResponse({ status: 200, type: [PartnerDto] })
  getPartners(): Promise<PartnerDto[]> {
    return this.partnersService.getPartners();
  }
}
