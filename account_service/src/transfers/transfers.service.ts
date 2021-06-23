import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../Logger/Logger.service';
import { HistoricalPricesMap } from '../balance/dto/price.response.dto';
import { EtherscanTransfer } from '../balance/interfaces/etherscan.interfaces';
import { AssetService } from '../chain/asset.service';
import { CHAIN_ID_BSC, CHAIN_ID_ETH } from '../common/constatnt';
import { ResultStatus } from '../common/enum';
import { Address } from '../common/interfaces';
import { ChainId, ChainsIds } from '../common/types';
import { PriceServiceResponse } from '../price/price.interfaces';
import { PriceService } from '../price/price.service';
import { BscScanService } from '../scan_api/bsc-scan.service';
import { EtherScanService } from '../scan_api/ether-scan.service';
import { ScanApiService } from '../scan_api/scan.api.service';
import {
  BlocksSubgraph,
  ResponseData as BlocksResponseData,
} from '../thegraph/blocks/blocks.subgraph';
import {
  getTokenDecimals,
  getUniqueAndToLowerCaseArrayData,
  mergeTransfersResponse,
  totalPrice,
} from '../utils/utils';
import { isEthChain } from '../utils/web3';
import {
  ERC20TransferDto,
  TransferDto,
  TransfersDetailedResponseDto,
  TransfersResponseDto,
} from './dto/transfers.dto';
import { TransferEntity } from './dto/transfers.entity';
import {
  ERC20Transfer,
  ScanTransfer,
  Transfer,
  TransfersResponse,
  TransferWithTokenAndPrices,
} from './interfaces/transfers.interfaces';
import { DbService } from './repository/db.service';

// TODO: delete redundant methods
@Injectable()
export class TransfersService {
  static mergeTransfersByAddress(
    transfers1: TransfersResponseDto,
    transfers2: TransfersResponseDto,
  ): TransfersResponseDto {
    const result = new Map<string, Transfer[]>(Object.entries(transfers1));
    Object.entries(transfers2).forEach(([key, value]) => {
      const t1Value = result.get(key);
      if (t1Value) {
        const transfers = t1Value.concat(value);
        result.set(key, transfers);
      } else {
        result.set(key, value);
      }
    });
    return Object.fromEntries<Transfer[]>(result);
  }

  private readonly chainToScan: Record<ChainId, ScanApiService>;

  constructor(
    private etherScanService: EtherScanService,
    private bscScanService: BscScanService,
    private readonly dbService: DbService,
    protected readonly priceService: PriceService,
    private readonly assetService: AssetService,
    private readonly blocksSubgraph: BlocksSubgraph,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.chainToScan = {
      [CHAIN_ID_ETH]: this.etherScanService,
      [CHAIN_ID_BSC]: this.bscScanService,
    };
  }

  private async queryTransfers(addresses: Address[], chainId: ChainId): Promise<TransferEntity[]> {
    try {
      const dbTransfers: TransferEntity[] = await this.dbService.getTransfersDataFromDb(
        addresses,
        chainId,
      );

      return dbTransfers;
    } catch (e) {
      this.logger.error(e, 'queryTransfers');
      throw e;
    }
  }

  private async getPrices(
    transferRows: TransferEntity[],
    chainId: ChainId,
  ): Promise<HistoricalPricesMap> {
    // form request params
    const timestamps: string[] = [];
    const tokenAddresses: string[] = [];
    transferRows.forEach((ts) => {
      timestamps.push(ts.blockTimeStamp);
      tokenAddresses.push(ts.tokenAddress);
    });
    this.logger.debug(`timestamps: ${timestamps.length} chainId: ${chainId}`);
    this.logger.debug(`tokenAddresses: ${tokenAddresses.length} chainId: ${chainId}`);
    // request
    const dataPrices = await this.priceService.getTokenHistoricalPrices(
      tokenAddresses,
      timestamps,
      chainId,
    );
    // handle response
    const { prices: priceData } = dataPrices;
    return priceData;
  }

  private addPrices(transferRows, priceData: HistoricalPricesMap): any {
    try {
      // add Token price to each Transfer
      transferRows.forEach((ts) => {
        const prices = priceData.get(ts.tokenAddress);
        const price = prices ? prices[ts.blockTimeStamp] : null;

        const decimals = getTokenDecimals(ts.tokenDecimals);
        const tokenPrice = price !== undefined ? price : null;

        ts.tokenPrice = tokenPrice;
        ts.tokenPriceUSD = tokenPrice;
        ts.totalPriceUSD = tokenPrice ? Number(ts.amount) * decimals * tokenPrice : tokenPrice;
      });
      return transferRows;
    } catch (e) {
      this.logger.error(e, 'addPrices');
      throw e;
    }
  }

  private toTransfersResponse(
    transfers: TransferWithTokenAndPrices[],
    addresses: Address[],
    chainId: ChainId,
  ): TransfersResponse<Transfer> {
    return addresses.reduce<TransfersResponse<Transfer>>((response, address) => {
      const userTransactions = transfers.filter(
        (transaction) => transaction.toAddress === address || transaction.fromAddress === address,
      );
      // get uniq hashes List in low register
      const uniqueUserHashes: string[] = getUniqueAndToLowerCaseArrayData(
        userTransactions.map((transaction) => transaction.hash),
      );

      const transactionWithTransfers = uniqueUserHashes.map<Transfer>((hash): Transfer => {
        const hashTransfers = userTransactions.filter((ts) => ts.hash === hash);

        const erc20Transfers: ERC20Transfer[] = hashTransfers.map(
          (transfer) => new ERC20TransferDto(transfer),
        );

        // TODO: add when gas will be added
        // const gasUsed =
        //   hashTransfers[0].gas && hashTransfers[0].gasPrice
        //     ? String(hashTransfers[0].gas * hashTransfers[0].gasPrice * DEFAULT_MULTIPLIER)
        //     : null;

        return new TransferDto({
          chainId: chainId,
          hash: hashTransfers[0].hash,
          blockTimeStamp: hashTransfers[0].blockTimeStamp,
          // TODO: add when gas will be added
          // gas: hashTransfers[0].gas,
          // gasPrice: hashTransfers[0].gasPrice,
          // gasUsed: gasUsed,
          //
          erc20Transfers,
        });
      });

      return {
        ...response,
        [address]: transactionWithTransfers,
      };
    }, {});
  }

  public async getTransfersByAddresses(
    addressArray: Address[],
    chainId: ChainId,
  ): Promise<TransfersDetailedResponseDto> {
    const result = new TransfersDetailedResponseDto(ResultStatus.ok, [], null);
    const transferRows: TransferEntity[] = await this.queryTransfers(addressArray, chainId);
    this.logger.debug(`transferRows: ${transferRows.length} chainId: ${chainId}`);
    if (transferRows.length) {
      try {
        const priceData: HistoricalPricesMap = await this.getPrices(transferRows, chainId);
        this.logger.debug(`priceData: ${priceData.entries.length} chainId: ${chainId}`);
        if (priceData.size) this.addPrices(transferRows, priceData); // add prices to transfers (side effect)
      } catch (e) {
        this.logger.error(e);
        result.error(e.message);
      }
    }
    result.data = this.toTransfersResponse(transferRows, addressArray, chainId);
    return result;
  }

  public async getAllTransactionDataByAddress(
    addresses: Address[],
  ): Promise<TransfersDetailedResponseDto> {
    this.logger.time('getAllTransactionDataByAddress');
    const allTransfersResponse: TransfersDetailedResponseDto = new TransfersDetailedResponseDto(
      ResultStatus.ok,
      [],
      null,
    );

    const addressArray = getUniqueAndToLowerCaseArrayData(addresses);

    this.logger.time('Promise.all<TransfersDetailedResponseDto>');
    const [ethTransfers, bscTransfers] = await Promise.all<TransfersDetailedResponseDto>([
      this.getTransfersByAddresses(addressArray, CHAIN_ID_ETH),
      this.getTransfersByAddresses(addressArray, CHAIN_ID_BSC),
    ]);
    this.logger.timeEnd('Promise.all<TransfersDetailedResponseDto>');

    this.logger.time('mergeTransfersByAddress');
    allTransfersResponse.data = TransfersService.mergeTransfersByAddress(
      ethTransfers.data,
      bscTransfers.data,
    );
    this.logger.timeEnd('mergeTransfersByAddress');

    this.logger.time('allTransfersResponse');
    allTransfersResponse.errors = [].concat(ethTransfers.errors, bscTransfers.errors);
    if (allTransfersResponse.errors.length) {
      allTransfersResponse.status = ResultStatus.error;
    }
    this.logger.timeEnd('allTransfersResponse');

    this.logger.timeEnd('getAllTransactionDataByAddress');
    return allTransfersResponse;
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

  async getExternalTransfers(
    addresses: Address[],
    chains: ChainsIds,
  ): Promise<TransfersResponse<ScanTransfer>> {
    const uniqueLowerCaseAddresses = getUniqueAndToLowerCaseArrayData(addresses);
    const transfers: TransfersResponse<ScanTransfer> = {};
    const handleScan = async (service: ScanApiService, addresses: string[]): Promise<boolean> => {
      const transfersResponse = await Promise.all<EtherscanTransfer[]>(
        addresses.map((address) => service.getTransfers(address)),
      );

      const singleArray: EtherscanTransfer[] = transfersResponse.flat();

      const transfersResult = await service.toTransfersResponse(singleArray, addresses);
      this.combineResults(transfers, transfersResult);
      return true;
    };

    const scans: ScanApiService[] = [];
    if (chains) {
      chains.map((n) => {
        scans.push(this.chainToScan[n]);
      });
    } else {
      scans.push(this.chainToScan[CHAIN_ID_ETH], this.chainToScan[CHAIN_ID_BSC]);
    }
    await Promise.allSettled(scans.map((scan) => handleScan(scan, uniqueLowerCaseAddresses)));

    const allTransfers = transfers;
    if (chains && chains.length && chains.filter((n) => isEthChain(n))) {
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
      return await this.addPricesToTransfers(allTransfers);
    }

    return allTransfers;
  }

  private async addTimestampsToTransfers(
    transfersResponse: TransfersResponse<ScanTransfer>,
  ): Promise<TransfersResponse<ScanTransfer>> {
    try {
      const missedBlocks: number[] = [];
      Object.keys(transfersResponse).map((k) => {
        const transfers: ScanTransfer[] = transfersResponse[k];
        transfers.map((t) => {
          if (isEthChain(t.chainId) && t.blockTimeStamp === null) {
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

      const blocksDataTimestamps: BlocksResponseData =
        await this.blocksSubgraph.getBlocksTimestamps(missedBlocks);
      const blocks = blocksDataTimestamps.data.blocks;

      Object.keys(transfersResponse).map((k) => {
        const transfers: ScanTransfer[] = transfersResponse[k];
        transfers.map((t) => {
          if (isEthChain(t.chainId) && t.blockTimeStamp === null) {
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
    transfersResponse: TransfersResponse<ScanTransfer>,
    chainId: number,
  ): Promise<PriceServiceResponse<HistoricalPricesMap>> {
    try {
      const unpricedContracts = [];
      Object.keys(transfersResponse).map((k) => {
        const transfers: ScanTransfer[] = transfersResponse[k];
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

  private async addPricesToTransfers(
    allTransfers: TransfersResponse<ScanTransfer>,
  ): Promise<TransfersResponse<ScanTransfer>> {
    const [ethPrices, bscPrices] = await Promise.all([
      this.getTransfersPrices(allTransfers, CHAIN_ID_ETH),
      this.getTransfersPrices(allTransfers, CHAIN_ID_BSC),
    ]);
    Object.keys(allTransfers).map((address) => {
      allTransfers[address].map((transfer) => {
        transfer.erc20Transfers.map((erc20Transfer) => {
          const tokenPriceUsd = isEthChain(transfer.chainId)
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
