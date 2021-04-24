import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Web3 from 'web3';

@Injectable()
export class Web3Service {
  public readonly web3;

  constructor(private configService: ConfigService) {
    this.web3 = new Web3(this.configService.get<string>('ETH_URL'));
  }
}
