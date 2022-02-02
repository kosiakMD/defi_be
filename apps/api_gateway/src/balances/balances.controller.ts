import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ChainIdEnum } from '@app/common';

import { BaseService } from '../common/services/base.service';

import { BalancesResponseDto } from './dto/balances.dto';

@ApiTags('Balances')
@Controller('v1/balances')
export class BalancesController extends BaseService {
  url = this.buildUrl(
    this.configService.get<string>('ACCOUNT_SERVICE_HOST'),
    this.configService.get<string>('ACCOUNT_SERVICE_PORT'),
  );

  @Get('/')
  // TODO: TBD clarify and cleanup
  // @ApiQuery({
  //   name: 'addresses',
  //   type: String,
  //   description: 'Array of Addresses (comma separated)',
  //   example:
  //     '0x43e5ffd0c720b356b0b0e9f8c8178ad35dd4050c,0x0baf7b79f9174c0840aa93a93a2c2a81044a09a2,0xa2107fa5b38d9bbd2c461d6edf11b11a50f6b974',
  // })
  // @ApiQuery({
  //   name: 'chains',
  //   type: String,
  //   required: false,
  //   description: 'Array of chain ID (comma separated)',
  //   example: '1,2,3,4',
  // })
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
  public getBalance(@Query() query): Promise<any> {
    return this.requestProxy(this.url + 'v1/balances', 'GET', { params: query });
  }

  @Get('/24h-return')
  // TODO: TBD clarify and cleanup
  // @ApiQuery({
  //   name: 'addresses',
  //   type: String,
  //   description: 'Array of Addresses (comma separated)',
  //   example:
  //     '0x43e5ffd0c720b356b0b0e9f8c8178ad35dd4050c,0x0baf7b79f9174c0840aa93a93a2c2a81044a09a2,0xa2107fa5b38d9bbd2c461d6edf11b11a50f6b974',
  // })
  // @ApiQuery({
  //   name: 'chains',
  //   type: String,
  //   required: false,
  //   description: 'Array of chain ID (comma separated)',
  //   example: '1,2,3,4',
  // })
  // @ApiQuery({
  //   name: 'assets',
  //   type: String,
  //   required: false,
  //   description: 'Array of asset addresses (comma separated)',
  //   example:
  //     '0xdac17f958d2ee523a2206206994597c13d831ec7,0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
  // })
  @ApiQuery({
    name: 'chains',
    type: Number,
    isArray: true,
    description: 'Array of chain ID',
    example: [ChainIdEnum.eth, ChainIdEnum.bsc],
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
  public get24HourReturns(@Query() query): Promise<any> {
    return this.requestProxy(this.url + 'v1/balances/24-hour-returns', 'GET', { params: query });
  }
}
