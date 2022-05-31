import axios from 'axios';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Transaction } from '../../../interfaces/transactions.common.interfaces';

@Injectable()
export class BscScanApi {
  private readonly BSCSCAN_KEY: string;
  private readonly BSCSCAN_URL: string;

  constructor(private configService: ConfigService) {
    this.BSCSCAN_KEY = this.configService.get<string>('BSCSCAN_KEY');
    this.BSCSCAN_URL = this.configService.get<string>('BSCSCAN_URL');
  }

  public async getTransactions(address: string): Promise<Transaction[]> {
    const {
      data: { result },
    } = await axios.get(
      `${this.BSCSCAN_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${this.BSCSCAN_KEY}`,
    );
    return result || [];
  }

  public async getInternalTransactions(address: string): Promise<Transaction[]> {
    const {
      data: { result },
    } = await axios.get(
      `${this.BSCSCAN_URL}?module=account&action=txlistinternal&address=${address}&startblock=0&endblock=2702578&sort=asc&apikey=${this.BSCSCAN_KEY}`,
    );
    return result || [];
  }
}
