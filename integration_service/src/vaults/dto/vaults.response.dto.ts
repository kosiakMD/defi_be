import { APY } from './apy.dto';
import { Token } from './token.dto';
import { VaultsEntity } from '../entities/vaults.entity';

export class VaultsResponseDto {
  id: number;
  vaultId: string;
  vaultName: string;
  project: string;
  chain: number;
  apy: APY;
  tvl: number;
  lpToken: Token;
  liquidityPoolTokens: Token[];
  rewardToken: Token;
  createdAt: Date;
  updatedAt: Date;

  public fromEntityToDto(entity: VaultsEntity) {
    this.id = +entity.id;
    this.vaultId = entity.vaultId;
    this.vaultName = entity.vaultName;
    this.project = entity.project;
    this.chain = +entity.chain;
    this.apy = entity.apy;
    this.tvl = +entity.tvl;
    this.lpToken = entity.lpToken;
    this.liquidityPoolTokens = entity.liquidityPoolTokens;
    this.rewardToken = entity.rewardToken;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
    return this;
  }
}
