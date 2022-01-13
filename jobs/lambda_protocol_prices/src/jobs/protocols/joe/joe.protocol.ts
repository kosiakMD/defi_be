import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { normalizeDecimals } from '@app/common/utils/number';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';

import { MulticallService } from '../../../chain/multicall.service';
import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { YearnSubgraph } from '../../../thegraph/yearn/subgraph';
import { PriceRequestCurrentDto } from '../../dto/PriceRequestCurrent.dto';
import { IProtocolPriceUpdate } from '../../interfaces/protocol.price.update';
import { ProtocolBase } from '../protocol.base';

const X_JOE = '0x57319d41f71e81f3c65f2a47ca4e001ebafd4f33';
const JOE = '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd';

@Injectable()
export class JoeProtocol extends ProtocolBase implements IProtocolPriceUpdate {
  chains = [ChainIdEnum.avax]; // TODO: Fantom
  job = `Joe_TokenPriceUpdate`;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly configService: ConfigService,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly multicallService: MulticallService,
    private readonly subgraph: YearnSubgraph,
  ) {
    super();
    this.chain = Number(configService.get('CHAIN_ID'));
  }
  async update() {
    const prices: PriceRequestCurrentDto[] = [];
    prices.push(await this.getXJoePrice());
    return prices;
  }

  private async getXJoePrice() {
    const xJoeContract = new ERC20(X_JOE);
    const joeContract = new ERC20(JOE);
    const [results, joePrice] = await Promise.all([
      this.multicallObject({
        'x-joe-decimals': xJoeContract.decimals(),
        'x-joe-total-supply': xJoeContract.totalSupply(),
        'joe-decimals': joeContract.decimals(),
        'joe-total-staked': joeContract.balanceOf(X_JOE),
      }),
      this.fetchPrice(JOE),
    ]);

    const totalXJoe = normalizeDecimals(
      results.get('x-joe-total-supply').output.data.toString(),
      results.get('x-joe-decimals').output.data.toNumber(),
    );
    const totalJoeStakedInContract = normalizeDecimals(
      results.get('joe-total-staked').output.data.toString(),
      results.get('joe-decimals').output.data.toNumber(),
    );

    const ratio = this.getXJoeRatio(totalXJoe, totalJoeStakedInContract);

    return this.formatPriceRequest(X_JOE, ratio * joePrice);
  }

  private getXJoeRatio(totalXJoe: number, totalJoeStakedInContract: number) {
    return 1 / (totalXJoe / totalJoeStakedInContract);
  }

  private multicallObject(calls: { [key: string]: CallData }) {
    const data = new Map(Object.entries(calls));
    return this.multicallService.handleInBatches(data);
  }
}
