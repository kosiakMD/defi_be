import { Injectable } from '@nestjs/common';

import { Logger } from '../Logger/Logger.service';
import { EtherscanTransfer } from '../balance/interfaces/etherscan.interfaces';
import { AssetService } from '../chain/asset.service';
import { PriceServiceResponse } from '../price/price.interfaces';
import { PriceService } from '../price/price.service';
import { BscScanService } from '../scan_api/bsc-scan.service';
import { EtherScanService } from '../scan_api/ether-scan.service';
import { ScanService } from '../scan_api/scan.service';
import {
  BlocksSubgraph,
  ResponseData as BlocksResponseData,
} from '../thegraph/blocks/blocks.subgraph';
import {
  CHAIN_ID_BSC,
  CHAIN_ID_ETH,
  getTokenDecimals,
  getUniqueAndToLowerCaseArrayData,
  mergeTransfersResponse,
  totalPrice,
} from '../utils/utils';
import {
  ERC20TokenTransfer,
  ERC20Transfer,
  TransactionWithToken,
  TransactionWithTokenAndPrices,
  Transfer,
  TransfersResponse,
} from './interfaces/transfers.interfaces';
import { DbService } from './repository/db.service';

@Injectable()
export class TransfersService {
  private readonly chainToScan: Record<number, ScanService>;

  constructor(
    private etherScanService: EtherScanService,
    private bscScanService: BscScanService,
    private readonly dbService: DbService,
    protected readonly priceService: PriceService,
    private readonly assetService: AssetService,
    private readonly blocksSubgraph: BlocksSubgraph,
    protected readonly logger: Logger,
  ) {
    this.chainToScan = {
      [CHAIN_ID_ETH]: this.etherScanService,
      [CHAIN_ID_BSC]: this.bscScanService,
    };
  }

  private readonly DEFAULT_MULTIPLIER: number = 1e-18;

  async getAllTransactionDataByAddress(addresses: string): Promise<TransfersResponse> {
    const addressArray = getUniqueAndToLowerCaseArrayData(addresses.split(','));

    const [transfers, bscTransaction] = await Promise.all([
      this.getTransactionByAddresses(addressArray, CHAIN_ID_ETH),
      this.getTransactionByAddresses(addressArray, CHAIN_ID_BSC),
    ]);

    const allTransfersResponse: TransfersResponse = {};

    Object.keys(transfers).forEach((key) => {
      allTransfersResponse[key] = [...transfers[key], ...bscTransaction[key]];
    });

    return allTransfersResponse;
  }

  async getTransactionByAddresses(
    addressArray: string[],
    chainId: number,
  ): Promise<TransfersResponse> {
    const formattedAddresses = addressArray.map((address) => `'${address}'`).join(',');

    const transferRows = await this.dbService.getTransfersDataFromDb(formattedAddresses, chainId);
    const transferRowsWithTokenPrices = await this.getTransfersWithTokenPrices(transferRows);

    return this.toTransfersResponse(transferRowsWithTokenPrices, addressArray, chainId);
  }

  private async getTransfersWithTokenPrices(
    transactions: TransactionWithToken[],
  ): Promise<TransactionWithTokenAndPrices[]> {
    return await Promise.all(
      transactions.map(async (transaction) => {
        const decimals = getTokenDecimals(transaction.tokenDecimals);

        try {
          return {
            ...transaction,
            tokenPriceUSD: transaction.tokenPrice || 0,
            totalPriceUSD: transaction.amount * decimals * transaction.tokenPrice,
          };
        } catch (_) {
          return {
            ...transaction,
            tokenPriceUSD: 0,
            totalPriceUSD: 0,
          };
        }
      }),
    );
  }

  private toTransfersResponse(
    transactions: TransactionWithTokenAndPrices[],
    addresses: string[],
    chainId: number,
  ): TransfersResponse {
    return addresses.reduce<TransfersResponse>((response, address) => {
      const userTransactions = transactions.filter(
        (transaction) => transaction.toAddress === address || transaction.fromAddress === address,
      );

      const uniqueUserHashes: string[] = getUniqueAndToLowerCaseArrayData(
        userTransactions.map((transaction) => transaction.hash),
      );

      const transactionWithTransfers = uniqueUserHashes.map<Transfer>((hash) => {
        const hashTransfers = userTransactions.filter((transaction) => transaction.hash === hash);
        const erc20Transfers: ERC20Transfer[] = hashTransfers.map((transfer) => {
          const tokenErc20: ERC20TokenTransfer = {
            address: transfer.tokenAddress,
            name: transfer.tokenName,
            symbol: transfer.tokenSymbol,
            decimals: transfer.tokenDecimals,
            totalSupply: transfer.tokenTotalSupply,
          };

          return {
            fromAddress: transfer.fromAddress,
            toAddress: transfer.toAddress,
            amount: transfer.amount,
            token: tokenErc20,
            tokenPriceUSD: transfer.tokenPriceUSD,
            totalPriceUSD: transfer.totalPriceUSD,
          };
        });

        return {
          chainId,
          hash: hashTransfers[0].hash,
          blockNumber: hashTransfers[0].blockNumber,
          blockTimeStamp: hashTransfers[0].blockTimeStamp,
          gas: hashTransfers[0].gas,
          gasPrice: hashTransfers[0].gasPrice,
          gasUsed: hashTransfers[0].gas * hashTransfers[0].gasPrice * this.DEFAULT_MULTIPLIER,
          erc20Transfers,
        };
      });

      return {
        ...response,
        [address]: transactionWithTransfers,
      };
    }, {});
  }

  public combineResults = (resultArray, chainArray): any => {
    const chainKeys = Object.keys(chainArray);
    if (chainArray && chainKeys.length > 0) {
      for (const transfer of chainKeys) {
        if (Object.keys(resultArray).includes(transfer)) {
          resultArray[transfer] = resultArray[transfer].concat(chainArray[transfer]);
        } else {
          resultArray[transfer] = chainArray[transfer];
        }
      }
    }
  };

  async getExternalTransfers(addresses: string, chains: number): Promise<TransfersResponse> {
    // let chainsSplitted = chains.toString().split(',')
    const chainNumbers: number[] = chains.toString().split(',').reduce((a, c) => {
      return [
        ...a,
        Number(c)
      ]
    }, [])
    const uniqueLowerCaseAddresses = getUniqueAndToLowerCaseArrayData(addresses.split(','));
    const transfers: TransfersResponse = {};
    const handleScan = async (service: ScanService, addresses: string[]): Promise<boolean> => {
      const transfersResponse = await Promise.all<EtherscanTransfer[]>(
        addresses.map((address) => service.getTransfers(address)),
      );

      const singleArray: EtherscanTransfer[] = transfersResponse.flat();

      const transfersResult = await service.toTransfersResponse(singleArray, addresses);
      this.combineResults(transfers, transfersResult);
      return true;
    };

    let scans: ScanService[] = []
    if (chainNumbers) {
      chainNumbers.map(n => {
        scans.push(this.chainToScan[n])
      })
    } else {
      scans = Object.values(this.chainToScan);
    }
    await Promise.allSettled(scans.map((scan) => handleScan(scan, uniqueLowerCaseAddresses)));

    let allTransfers = transfers
    if (chainNumbers.filter(n => n === 1)) {
      // this call works pretty fast, but there is no block timestamp fuck!
      const additionalTransfers = await this.assetService.getConvertedTransfers(
        uniqueLowerCaseAddresses,
      );

      let allTransfers = mergeTransfersResponse(
        uniqueLowerCaseAddresses,
        transfers,
        additionalTransfers,
      );

      allTransfers = await this.addTimestampsToTransfers(allTransfers);
      allTransfers = await this.addPricesToTransfers(allTransfers);
    }

    return allTransfers;
  }

  private async addTimestampsToTransfers(
    transfersResponse: TransfersResponse,
  ): Promise<TransfersResponse> {
    try {
      const missedBlocks: number[] = [];
      Object.keys(transfersResponse).map((k) => {
        const transfers: Transfer[] = transfersResponse[k];
        transfers.map((t) => {
          if (t.chainId === CHAIN_ID_ETH && t.blockTimeStamp === null) {
            const isMissed = missedBlocks.find((blockNumber) => blockNumber === t.blockNumber);
            if (!isMissed) {
              missedBlocks.push(Number(t.blockNumber));
            }
          }
        });
      });
      if (!missedBlocks) {
        return transfersResponse;
      }

      const blocksDataTimestamps: BlocksResponseData = await this.blocksSubgraph.getBlocksTimestamps(
        missedBlocks,
      );
      const blocks = blocksDataTimestamps.data.blocks;

      Object.keys(transfersResponse).map((k) => {
        const transfers: Transfer[] = transfersResponse[k];
        transfers.map((t) => {
          if (t.chainId === CHAIN_ID_ETH && t.blockTimeStamp === null) {
            const blockTimestamp = blocks.find((b) => Number(b.number) === Number(t.blockNumber));
            if (blockTimestamp) {
              t.blockTimeStamp = blockTimestamp.timestamp;
            }
          }
        });
      });
    } catch (e) {
      this.logger.warn('error fetching block timestamps for transfers');
    }
    return transfersResponse;
  }

  private async getTransfersPrices(
    transfersResponse: TransfersResponse,
    chainId: number,
  ): Promise<PriceServiceResponse> {
    try {
      const unpricedContracts = [];
      Object.keys(transfersResponse).map((k) => {
        const transfers: Transfer[] = transfersResponse[k];
        transfers.map((t) => {
          if (t.chainId === chainId) {
            for (const transfer of t.erc20Transfers) {
              const transferInArray = unpricedContracts.find(
                (unpricedContract) => unpricedContract.address === transfer.token.address,
              );
              if (transferInArray) {
                transferInArray.timestamps.push(Number(t.blockTimeStamp));
              } else {
                unpricedContracts.push({
                  address: transfer.token.address,
                  timestamps: [Number(t.blockTimeStamp)],
                });
              }
            }
          }
        });
      });
      return await this.priceService.getHistoricalPrices(unpricedContracts, chainId);
    } catch (e) {
      this.logger.warn('error fetching token prices for transfers');
      throw e;
    }
  }

  private async addPricesToTransfers(allTransfers: TransfersResponse): Promise<TransfersResponse> {
    const [ethPrices, bscPrices] = await Promise.all([
      this.getTransfersPrices(allTransfers, CHAIN_ID_ETH),
      this.getTransfersPrices(allTransfers, CHAIN_ID_BSC),
    ]);
    Object.keys(allTransfers).map((address) => {
      allTransfers[address].map((transfer) => {
        transfer.erc20Transfers.map((erc20Transfer) => {
          const tokenPriceUsd =
            transfer.chainId === CHAIN_ID_ETH
              ? ethPrices.prices[erc20Transfer.token.address][transfer.blockTimeStamp]
              : bscPrices.prices[erc20Transfer.token.address][transfer.blockTimeStamp];
          erc20Transfer.tokenPriceUSD = tokenPriceUsd;
          erc20Transfer.totalPriceUSD = totalPrice(
            erc20Transfer.amount.toString(),
            tokenPriceUsd,
            erc20Transfer.token.decimals ? erc20Transfer.token.decimals : 18,
          );
        });
      });
    });
    return allTransfers;
  }
}
