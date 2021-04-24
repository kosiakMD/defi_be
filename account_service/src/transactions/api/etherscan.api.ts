import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { Transaction } from '../interfaces/api.transactions.interfaces';

@Injectable()
export class EtherscanApi {
  private readonly ETHERSCAN_KEY: string;
  private readonly ETHERSCAN_URL: string;

  constructor(private configService: ConfigService) {
    this.ETHERSCAN_KEY = this.configService.get<string>('ETHERSCAN_KEY');
    this.ETHERSCAN_URL = this.configService.get<string>('ETHERSCAN_URL');
  }

  public async getTransactions(address: string): Promise<Transaction[]> {
    const {
      data: { result },
    } = await axios.get(
      `${this.ETHERSCAN_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${this.ETHERSCAN_KEY}`,
    );
    return result || [];
  }

  public async getInternalTransactions(address: string): Promise<Transaction[]> {
    const {
      data: { result },
    } = await axios.get(
      `${this.ETHERSCAN_URL}?module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${this.ETHERSCAN_KEY}`,
    );
    return result || [];
  }
}
