import * as Promise from 'bluebird';

import { Controller, Get, HttpStatus, Inject, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { ResultStatus } from '@app/common/enum';

import { TransactionsDetailedResponseDto } from './dto/scans-api.dto';
import { BscScanService } from './modules/bscscan/bsc-scan.service';
import { EtherScanService } from './modules/etherscan/ether-scan.service';
import { ScanService } from './modules/scan.service';
import { CHAIN_ID_BSC, CHAIN_ID_ETH } from './modules/utils/utils';

@ApiTags('Transactions')
@Controller('v1/transactions')
export class ScansApiController {
  private readonly ethChainId: number;
  private readonly bscChainId: number;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private etherScanService: EtherScanService,
    private bscScanService: BscScanService,
  ) {
    this.ethChainId = CHAIN_ID_ETH;
    this.bscChainId = CHAIN_ID_BSC;
  }

  @Get('/')
  @ApiQuery({
    name: 'addresses[]',
    type: [String],
    description: 'Array of Addresses (comma separated)',
    example:
      '0xcff17036c5ae141f2244f480fc16ba244ffab33b,0x07471d0262b17529a489d0c696eef988f89464ac',
  })
  @ApiQuery({
    name: 'chains',
    type: String,
    required: false,
    description: `Array of chains' IDs (comma separated)`,
    example: '1,2',
  })
  @ApiResponse({ status: HttpStatus.OK, type: TransactionsDetailedResponseDto, isArray: true })
  public async getTransactions(@Query() query): Promise<any> {
    const { chains, addresses } = query;

    const result = {
      status: ResultStatus.ok,
      errors: [],
      transactions: [],
    };

    const concatTxs = (newTxs): TransactionsDetailedResponseDto[] =>
      (result.transactions = result.transactions.concat(newTxs));

    if (chains && chains.length) {
      const handleChain = async (chainId, service: ScanService): Promise<any> => {
        if (chains.includes(chainId)) {
          const txs = await Promise.allSettled(
            addresses.map((address) => service.getScanTransactions(address)),
          );
          txs.forEach((tx) => {
            if (tx.status === 'fulfilled') {
              concatTxs(tx.value.data);
              if (tx.value.errors) result.errors.push(tx.value.errors);
            } else {
              result.errors.push(tx.reason);
            }
          });
        }
      };
      await Promise.all([
        handleChain(this.ethChainId, this.etherScanService),
        handleChain(this.bscChainId, this.bscScanService),
      ]);
    } else {
      const [ethTransactions, bscTransactions] = await Promise.allSettled([
        Promise.all(addresses.map((address) => this.etherScanService.getScanTransactions(address))),
        Promise.all(addresses.map((address) => this.bscScanService.getScanTransactions(address))),
      ]);

      const checkFulfillment = (chainsTxResults): any => {
        chainsTxResults.forEach((chainTxsResult) => {
          if (chainTxsResult.status === 'fulfilled') {
            chainTxsResult.value.forEach((tx) => {
              concatTxs(tx.transactions);
              if (tx.error) result.errors.push(tx.error);
            });
          } else {
            result.errors.push(chainTxsResult.reason);
          }
        });
        if (result.errors.length) {
          result.status = ResultStatus.error;
        }
        return result;
      };

      checkFulfillment([ethTransactions, bscTransactions]);
    }

    if (result.errors.length) {
      result.status = ResultStatus.error;
    }
    return result;
  }
}
