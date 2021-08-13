import { Controller, Get, HttpException } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { NetworkResponseDto } from './dto';
import { NetworksService } from './networks.service';

@ApiTags('Networks')
@Controller('networks')
export class NetworksController {
  constructor(private networksService: NetworksService) {}

  @Get('')
  @ApiResponse({ status: 200, type: [NetworkResponseDto] })
  getNetworks(): Promise<NetworkResponseDto[]> {
    try {
      return this.networksService.getNetworks();
    } catch (e) {
      throw new HttpException(e.response, e.code);
    }
  }
}
