import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../common/Logger/Logger.service';
import { TransactionsResponseDto } from './models/dto/transactions.dto';
import { BscscanService } from './modules/bscscan/bscscan.service';
import { EtherscanService } from './modules/etherscan/etherscan.service';
import { CHAIN_ID_ETH, CHAIN_ID_BSC } from './modules/utils/utils';

@ApiTags('Transactions')
@Controller('transactions')
export class ChainApiController {
  private readonly ethChainId: number;
  private readonly bscChainId: number;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private etherscanService: EtherscanService,
    private bscscanService: BscscanService,
  ) {
    this.ethChainId = CHAIN_ID_ETH;
    this.bscChainId = CHAIN_ID_BSC;
  }

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
    const chainIds = chainId ? chainId.split(',') : null;
    const addressesArr = addresses.split(',');

    if (chainIds) {
      const response = [];
      if (chainIds.includes(this.ethChainId.toString())) {
        const ethTransactions = await Promise.allSettled(
          addressesArr.map((address) => this.etherscanService.getEtherScanTransactions(address)),
        );
        response.push(ethTransactions[0]['value']);
      }
      if (chainIds.includes(this.bscChainId.toString())) {
        const bscTransactions = await Promise.allSettled(
          addressesArr.map((address) => this.bscscanService.getBscScanTransactions(address)),
        );
        if (bscTransactions[0].status == 'fulfilled') {
          response.push(bscTransactions[0]['value']);
        }
      }
      return response[0];
    } else {
      const [ethTransactions, bscTransactions] = await Promise.allSettled([
        Promise.all(
          addressesArr.map((address) => this.etherscanService.getEtherScanTransactions(address)),
        ),
        Promise.all(
          addressesArr.map((address) => this.bscscanService.getBscScanTransactions(address)),
        ),
      ]);

      const checkFulfillment = (txResultarray): any => {
        const result = [];
        for (const txArray of txResultarray) {
          if (txArray.status == 'fulfilled') {
            for (const tx of txArray.value[0]) {
              result.push(tx);
            }
          }
        }
        return result;
      };

      const result = checkFulfillment([ethTransactions, bscTransactions]);

      return result;
    }
  }
}
