import { ChainNameEnum, TransactionType } from '@app/common/enum';

import {
  Transaction,
  TransactionsResponse,
} from '../../common/interfaces/transactions.common.interfaces';
import { BscscanApi } from '../../common/providers/chainRelated/scans/bscscan.api';
import { Web3Service } from '../../common/providers/chainRelated/web3.service';

import { ChainsService } from '../chains/chains.service';

export class BscscanTransactionsService {
  constructor(
    private readonly bscscan: BscscanApi,
    private readonly web3Service: Web3Service,
    private readonly chainsService: ChainsService,
  ) {}

  public async getTransactions(
    addresses: string[],
    type: TransactionType,
  ): Promise<TransactionsResponse | []> {
    if (this.isAddressesNotCorrect(addresses)) return [];

    return this.toTransactionsResponse(addresses, type);
  }

  private isAddressesNotCorrect(addresses: string[]): boolean {
    if (!addresses.length) {
      return true;
    }
    return !addresses.every(this.web3Service.web3.utils.isAddress);
  }

  private async toTransactionsResponse(
    addresses: string[],
    type: string,
  ): Promise<TransactionsResponse> {
    return (
      await Promise.all(
        addresses.map(async (address) => {
          const transactions = await this.getAndformatTransactions(address, type);

          return {
            [address]: transactions,
          };
        }),
      )
    ).reduce((acc, transaction) => {
      return Object.assign(acc, transaction);
    }, {});
  }

  private async getAndformatTransactions(address: string, type: string): Promise<Transaction[]> {
    let transactions;

    if (type === 'internal') {
      transactions = await this.bscscan.getInternalTransactions(address.toLowerCase());
    }
    if (type === 'normal') {
      transactions = await this.bscscan.getTransactions(address.toLowerCase());
    }
    if (typeof transactions !== 'object') {
      transactions = [];
    }

    const chainId = await this.chainsService.getChainIdByName(ChainNameEnum.bnb);

    return transactions.map(
      ({
        blockNumber,
        timeStamp,
        hash,
        nonce,
        blockHash,
        transactionIndex,
        from,
        to,
        value,
        gas,
        gasPrice,
        isError,
        // eslint-disable-next-line
        txreceipt_status,
        input,
        contractAddress,
        cumulativeGasUsed,
        gasUsed,
        confirmations,
      }) => {
        return {
          blockNumber,
          timeStamp,
          hash,
          nonce,
          blockHash,
          transactionIndex,
          from,
          to,
          value,
          gas,
          gasPrice,
          isError,
          // eslint-disable-next-line
          txreceiptStatus: txreceipt_status,
          input,
          contractAddress,
          cumulativeGasUsed,
          gasUsed,
          confirmations,
          chainId,
          isInternal: type === 'internal' ? true : undefined,
        };
      },
    );
  }
}
