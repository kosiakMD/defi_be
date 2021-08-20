// TODO: TBD, do we need all platforms in 1 place?
// import { Controller, Get, Param } from '@nestjs/common';
// import { ApiResponse, ApiTags } from '@nestjs/swagger';
//
// import BaseDataDto from  'src/common/DTO/BaseData.dto';
// import EthereumAddressDto from  'src/common/DTO/EthereumAddress.dto';
// import PlatformDataDto from  'src/common/DTO/PlatofrmData.dto';
// import { PlatformData } from  'src/common/interfaces';
//
// @ApiTags('Platform')
// @Controller('platform')
// export class PlatformController {
//   @Get('/:address')
//   @ApiResponse({ status: 200, type: PlatformDataDto })
//   get(@Param() params: EthereumAddressDto): PlatformData {
//     const base = new BaseDataDto();
//     return {
//       balancer: [base],
//       curve: [base],
//       sushiswap: [base],
//       uniswap: [base],
//     };
//   }
// }
