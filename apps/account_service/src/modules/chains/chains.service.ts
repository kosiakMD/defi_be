import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { In, Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';

import { ChainId } from '@app/common';
import { CrudService } from '@app/common/services/crud.service';

import { ChainsResponseDto } from './dto/chains-response.dto';
import { ChainsEntity } from './entities/chain.entity';

@Injectable()
export class ChainsService extends CrudService<ChainsEntity> {
  constructor(
    @InjectRepository(ChainsEntity) private readonly chainRepository: Repository<ChainsEntity>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    super(chainRepository);
  }

  private rpcMap = new Map<number, any>();

  public async getAllChains() {
    const chains = await this.getAll();
    const chainsResponse = chains.map((c: ChainsEntity) => {
      const chainResponse = new ChainsResponseDto();
      chainResponse.chain = c;
      chainResponse.chain.rpc = this.rpcMap.get(c.id);
      return chainResponse;
    });

    return chainsResponse;
  }

  public async getOneChain(id) {
    const chainResponse = new ChainsResponseDto();
    chainResponse.chain = await this.get(id);
    chainResponse.chain.rpc = this.rpcMap.get(chainResponse.chain.id);
    return chainResponse;
  }

  public async getChainIdByName(name: string) {
    const chain = await this.get({ name });
    return chain.id;
  }

  public async getManyChainIdsByNames(names: string[]) {
    const chains = await this.getAll({
      where: {
        name: In(names),
      },
    });

    return chains.map((c) => c.id);
  }

  public async getChainNameById(id) {
    const chain = await this.get({ id });
    return chain.name;
  }

  public async getChainAbbrByNameOrAbbr(name: string) {
    let chain = await this.get({ name });
    if (chain) return chain;
    chain = await this.get({ abbr: name });
    return chain.abbr;
  }

  public async getInternalChainIdByAbsId(chainId) {
    const chains = await this.getAll();
    const chain = chains.find((c) => c.metadata.absoluteChainId === chainId);
    return chain.id;
  }

  // 3rd party platforms

  public async getCoingeckoPlatformId(chainId: ChainId) {
    const chain = await this.get({ id: chainId });
    return chain.metadata.coingeckoPlatformId;
  }

  public async debankPlatformId(chainId: ChainId) {
    const chain = await this.get({ id: chainId });
    return chain.metadata.debankPlatformId;
  }

  public async getAbsoluteChainId(chainId) {
    const chain = await this.get({ id: chainId });
    return chain.metadata.absoluteChainId;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  private async getRpcData() {
    const rpcData = await firstValueFrom(
      this.http
        .get(this.config.get('RPC_SERVICE_HOST') + 'v1/endpoints?limit=500')
        .pipe(map((r) => r.data.items)),
    );

    for (const rpc of rpcData) {
      this.rpcMap.set(rpc.chainId, rpc);
    }
  }
}
