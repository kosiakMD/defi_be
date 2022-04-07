import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { CHAIN_ID_BSC, CHAIN_ID_ETH } from '@app/common/constant';
import { ResultStatus } from '@app/common/enum';
import { Address } from '@app/common/types';

import { EtherscanTransfer } from '../../common/interfaces/ether.scan.interfaces';
import { PriceServiceResponse } from '../../common/interfaces/prices.comon.interfaces';
import {
  ERC20Transfer,
  ScanTransfer,
  Transfer,
  TransfersResponse,
  TransferWithTokenAndPrices,
} from '../../common/interfaces/transfers.common.interfaces';
import { BscScanService } from '../../common/providers/chainRelated/scans/bsc-scan.service';
import { EtherScanService } from '../../common/providers/chainRelated/scans/ether-scan.service';
import { PolygonScanService } from '../../common/providers/chainRelated/scans/polygon-scan.service';
import { ScanApiService } from '../../common/providers/chainRelated/scans/scan.api.service';
import { HistoricalPricesMap } from '../../common/providers/microservices/price/dto/price.response.dto';
import { PriceService } from '../../common/providers/microservices/price/price.service';
import {
  getTokenDecimals,
  getUniqueAndToLowerCaseArrayData,
  mergeTransfersResponse,
  totalPrice,
} from '../../common/utils';
import { isEthChain } from '../../common/utils/web3';

import { AssetService } from '../assets/asset.service';
import { AssetsEntity } from '../assets/entities/assets.entity';
import {
  ERC20TransferDto,
  TransferDto,
  TransfersDetailedResponseDto,
  TransfersResponseDto,
} from './dto/transfers.dto';
import { TransferEntity, TransferEntityNew } from './entities/transfers.entity';
import { ResponseData as BlocksResponseData } from './interfaces/transfers.block.interface';
import { TransfersBlocksSubgraph } from './transfers.blocks.subgraph';
import { TransfersDbService } from './transfers.db.service';

// TODO: delete redundant methods
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

  private readonly chainToScan: Partial<Record<number, ScanApiService>>;

  constructor(
    private etherScanService: EtherScanService,
    private bscScanService: BscScanService,
    private polygonScanService: PolygonScanService,
    private readonly dbService: TransfersDbService,
    protected readonly priceService: PriceService,
    private readonly assetService: AssetService,
    private readonly blocksSubgraph: TransfersBlocksSubgraph,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.chainToScan = {
      1: this.etherScanService,
      2: this.bscScanService,
      3: this.polygonScanService,
    };
  }

  private async queryTransfers(
    addresses: Address[],
    chainId,
  ): Promise<TransferEntity[]> {
    try {
      const dbTransfers: TransferEntity[] = await this.dbService.getTransfersDataFromDb(
        addresses,
        chainId,
      );

      return dbTransfers;
    } catch (e: any) {
      this.logger.error(e, 'queryTransfers');
      throw e;
    }
  }

  async queryAssetTransfers(
    asset: AssetsEntity,
    addresses: string[],
  ): Promise<TransferEntityNew[]> {
    try {
      return this.dbService.getAssetTransfers(asset, addresses);
    } catch (e: any) {
      this.logger.error(e, 'queryAssetTransfers');
      throw e;
    }
  }

  private async getPrices(
    transferRows: TransferEntity[],
    chainId,
  ): Promise<HistoricalPricesMap> {
    // form request params
    const tokenAddresses: Set<string> = new Set<string>();
    const assetsForPrices = [];
    transferRows.map((tr) => {
      tokenAddresses.add(tr.tokenAddress);
    });
    tokenAddresses.forEach((a) => {
      const tokenTransfersRows: TransferEntity[] = transferRows.filter(
        (tr) => tr.tokenAddress === a,
      );
      assetsForPrices.push({
        address: a,
        timestamps: tokenTransfersRows.map((ttr) => ttr.blockTimeStamp),
      });
    });
    this.logger.debug(`tokenAddresses: ${tokenAddresses.size} chainId: ${chainId}`);
    // request
    const dataPrices = await this.priceService.getHistoricalPrices(assetsForPrices, chainId);
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
    } catch (e: any) {
      this.logger.error(e, 'addPrices');
      throw e;
    }
  }

  private toTransfersResponse(
    transfers: TransferWithTokenAndPrices[],
    addresses: Address[],
    chainId,
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

        return new TransferDto({
          chainId,
          hash: hashTransfers[0].hash,
          blockTimeStamp: hashTransfers[0].blockTimeStamp,
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
    chainId: number,
  ): Promise<TransfersDetailedResponseDto> {
    const result = new TransfersDetailedResponseDto(ResultStatus.ok, [], null);
    const transferRows: TransferEntity[] = await this.queryTransfers(addressArray, chainId);
    this.logger.debug(`transferRows: ${transferRows.length} chainId: ${chainId}`);
    if (transferRows.length) {
      try {
        const priceData: HistoricalPricesMap = await this.getPrices(transferRows, chainId);
        this.logger.debug(`priceData: ${priceData.size} chainId: ${chainId}`);
        if (priceData.size) {
          this.addPrices(transferRows, priceData); // add prices to transfers (side effect)
        }
      } catch (e: any) {
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
    chains: number[],
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
    } catch (e: any) {
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
    } catch (e: any) {
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
