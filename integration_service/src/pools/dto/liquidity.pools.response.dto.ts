import { LiquidityPoolsEntity } from '../entities/liquidity.pools.entity';
import { APY } from './apy.dto';
import { ImpermanentLoss } from './impermanentloss.dto';
import { Token } from './token.dto';

export class LiquidityPoolsResponseDto {
  id: number;
  address: string;
  chain: number;
  project: string;
  reserveUsd: number;
  apy: APY;
  il: ImpermanentLoss;
  token: Token;
  poolTokens: Token[];
  createdAt: Date;
  updatedAt: Date;

  public fromEntityToDto(entity: LiquidityPoolsEntity) {
    this.id = +entity.id;
    this.address = entity.address;
    this.chain = +entity.chain;
    this.project = entity.project;
    this.reserveUsd = +entity.reserveUsd;
    this.apy = entity.apy;
    this.il = entity.il;
    this.token = entity.token;
    this.poolTokens = entity.poolTokens;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
    return this;
  }
}
