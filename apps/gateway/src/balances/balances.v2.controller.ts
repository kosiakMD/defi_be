import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ChainIdEnum } from '@app/common';

import { BaseService } from '../common/services/base.service';

import { BalancesQueryDto, BalancesResponseDto } from './dto/balances.dto';

// TODO: Temporary until fixed and replaces V1
@ApiTags('Balances')
@Controller('v1/balances-v2')
export class BalancesV2Controller extends BaseService {
  url = this.buildUrl(
    this.configService.get<string>('ACCOUNT_SERVICE_HOST'),
    this.configService.get<string>('ACCOUNT_SERVICE_PORT'),
  );

  @Get('/')
  @ApiQuery({
    name: 'chains',
    type: Number,
    isArray: true,
    description: 'Array of chain ID',
    required: false,
  })
  @ApiQuery({
    name: 'addresses',
    type: String,
    isArray: true,
    description: 'Array of address',
    example: [
      '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85',
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
    ],
  })
  @ApiQuery({
    name: 'assets',
    type: String,
    isArray: true,
    required: false,
    description: 'Array of asset addresses',
    example: [],
  })
  @ApiResponse({ status: HttpStatus.OK, type: BalancesResponseDto })
  public getBalance(@Query() { addresses, chains }: BalancesQueryDto): Promise<any> {
    return this.requestProxy(this.url + 'v1/balances-v2', 'GET', { params: { addresses, chains } });
  }

  @Get('/24h-return')
  @ApiQuery({
    name: 'chains',
    type: Number,
    isArray: true,
    description: 'Array of chain ID',
    example: [ChainIdEnum.eth, ChainIdEnum.bnb],
  })
  @ApiQuery({
    name: 'addresses',
    type: String,
    isArray: true,
    description: 'Array of user address',
    example: [
      '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85',
      '0x60dE7F647dF2448eF17b9E0123411724De6e373D',
    ],
  })
  @ApiQuery({
    name: 'assets',
    type: String,
    isArray: true,
    required: false,
    description: 'Array of asset addresses',
    example: [
      '0xdac17f958d2ee523a2206206994597c13d831ec7',
      '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
    ],
  })
  @ApiResponse({ status: HttpStatus.OK, type: BalancesResponseDto })
  public get24HourReturns(@Query() { addresses, chains }: BalancesQueryDto): Promise<any> {
    return this.requestProxy(this.url + 'v1/balances-v2/24-hour-returns', 'GET', {
      params: { addresses, chains },
    });
  }
}
