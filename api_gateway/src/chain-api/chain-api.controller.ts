  import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { EtherscanService } from './modules/etherscan/etherscan.service'
import { BscscanService } from './modules/bscscan/bscscan.service'
import { Logger } from '../common/Logger/Logger.service';
import { TransactionsResponseDto } from './models/dto/transactions.dto'

@ApiTags('Transactions')
@Controller('transactions')
export class ChainApiController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private etherscanService:EtherscanService,
    private bscscanService:BscscanService
  ) {}
  
  @Get('/')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Addresses (comma separated)',
    example:
      '0xcff17036c5ae141f2244f480fc16ba244ffab33b,0x07471d0262b17529a489d0c696eef988f89464ac',
  })
  @ApiQuery({
    name: 'chainId',
    type: String,
    required: false,
    description: `Array of chains' IDs (comma separated)`,
    // example: '1,2',
    example: '',
  })
  // @ApiResponse({ status: 200, type: Object, isArray: true })
  @ApiResponse({ status: 200, type: TransactionsResponseDto, isArray: true })
  public async getTransactions(
    @Query('chainId') chainId,
    @Query('addresses') addresses,
  ): Promise<any> {
    const chainIds = (chainId) ? chainId.split(',') : null
    const addressesArr = addresses.split(',')

    if(chainIds){
      const response = []
      if(chainIds.includes("1")) {
        console.log('ETH ETH ETH')
        const ethTransactions = await Promise.allSettled(addressesArr.map(address => this.etherscanService.getEtherscanTransaction(address)))
        response.push(ethTransactions[0]["value"]);
      }
      if (chainIds.includes("2")) {
        console.log('BSC BSC BSC')
        const bscTransactions = await Promise.allSettled(addressesArr.map(address => this.bscscanService.getBscscanTransaction(address)))
        if(bscTransactions[0].status == "fulfilled"){
          response.push(bscTransactions[0]["value"]);
        }
      }
      return response;
    } else {

      const [ethTransactions, bscTransactions] = await Promise.all([
        Promise.allSettled(addressesArr.map(address => this.etherscanService.getEtherscanTransaction(address))),
        Promise.allSettled(addressesArr.map(address => this.bscscanService.getBscscanTransaction(address)))
      ]);

      const mapResponse = (txArray) => {
        const result = txArray.map((tx) => {
        if(tx.status == "fulfilled"){
            return tx.value
          }
        })
        return result[0]
      }

      return [
        {
          chainId: 1,
          data: mapResponse(ethTransactions),
        },
        {
          chainId: 2,
          data: mapResponse(bscTransactions),
        }
      ]
    }
  }
}

