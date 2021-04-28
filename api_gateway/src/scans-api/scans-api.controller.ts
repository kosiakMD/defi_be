import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../common/Logger/Logger.service';
import { TransactionsResponseDto } from './models/dto/transactions.dto';
import { ResultStatus, TransactionsResult } from './models/interfaces/transactions.interfaces';
import { BscscanService } from './modules/bscscan/bscscan.service';
import { EtherscanService } from './modules/etherscan/etherscan.service';
import { ScanService } from './modules/scan.service';
import { CHAIN_ID_BSC, CHAIN_ID_ETH } from './modules/utils/utils';
import { TransactionQueryDto } from './scans-api.dto';

@ApiTags('Transactions')
@Controller('transactions')
export class ScansApiController {
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
    name: 'chains',
    type: String,
    required: false,
    description: `Array of chains' IDs (comma separated)`,
    // example: '1,2',
    example: '',
  })
  @ApiResponse({ status: 200, type: TransactionsResponseDto, isArray: true })
  public async getTransactions(@Query() query: TransactionQueryDto): Promise<any> {
    const { chains, addresses } = query;

    const result = {
      status: ResultStatus.ok,
      errors: [],
      transactions: [],
    };
    //
    const concatTxs = (newTxs): TransactionsResult[] =>
      (result.transactions = result.transactions.concat(newTxs));

    if (chains && chains.length) {
      const handleChain = async (chainId, service: ScanService): Promise<any> => {
        if (chains.includes(chainId)) {
          const txs = await Promise.allSettled(
            addresses.map((address) => service.getScanTransactions(address)),
          );
          txs.forEach((tx) => {
            if (tx.status === 'fulfilled') {
              concatTxs(tx.value.transactions);
              if (tx.value.error) result.errors.push(tx.value.error);
            } else {
              result.errors.push(tx.reason);
            }
          });
        }
      };
      await Promise.all([
        handleChain(this.ethChainId, this.etherscanService),
        handleChain(this.bscChainId, this.bscscanService),
      ]);
    } else {
      const [ethTransactions, bscTransactions] = await Promise.allSettled([
        Promise.all(addresses.map((address) => this.etherscanService.getScanTransactions(address))),
        Promise.all(addresses.map((address) => this.bscscanService.getScanTransactions(address))),
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
