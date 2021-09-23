import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Inject, Injectable } from '@nestjs/common';

import { CHAIN_ID_BSC, CHAIN_ID_ETH } from 'src/common/constatnt';
import { ChainIdEnum, ResultStatus } from 'src/common/enum';
import { Address } from 'src/common/interfaces';

import { Logger } from '../Logger/Logger.service';
import { AssetsEntity } from '../assets/entity/assets.entity';
import { HistoricalPricesMap } from '../balance/dto/price.response.dto';
import { PriceService } from '../price/price.service';
import { getTokenDecimals, getUniqueAndToLowerCaseArrayData } from '../utils/utils';
import {
  ERC20TransferDto,
  TransferDto,
  TransfersDetailedResponseDto,
  TransfersResponseDto,
} from './dto/transfers.dto';
import { TransferEntity, TransferEntityNew } from './dto/transfers.entity';
import {
  ERC20Transfer,
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

  constructor(
    private readonly dbService: DbService,
    protected readonly priceService: PriceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  private async queryTransfers(
    addresses: Address[],
    chainId: ChainIdEnum,
  ): Promise<TransferEntity[]> {
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

  async queryAssetTransfers(
    asset: AssetsEntity,
    addresses: string[],
  ): Promise<TransferEntityNew[]> {
    try {
      return this.dbService.getAssetTransfers(asset, addresses);
    } catch (e) {
      this.logger.error(e, 'queryAssetTransfers');
      throw e;
    }
  }

  private async getPrices(
    transferRows: TransferEntity[],
    chainId: ChainIdEnum,
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
    } catch (e) {
      this.logger.error(e, 'addPrices');
      throw e;
    }
  }

  private toTransfersResponse(
    transfers: TransferWithTokenAndPrices[],
    addresses: Address[],
    chainId: ChainIdEnum,
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
          chainId: chainId,
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
    chainId: ChainIdEnum,
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
}
