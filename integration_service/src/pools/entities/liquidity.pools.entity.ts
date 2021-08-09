import { Column, Entity, PrimaryColumn } from 'typeorm';

import { APYDto } from '../dto/apy.dto';
import { ImpermanentLossDto } from '../dto/impermanentloss.dto';
import { TokenDto } from '../dto/token.dto';
import { ChainIdEnum, PlatformEnum, ProtocolName } from 'src/common/enum';

@Entity('liquidity_pools')
export class LiquidityPoolsEntity {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'address', nullable: true })
  address: string;

  @Column({ name: 'chain', nullable: true })
  chain: ChainIdEnum;

  @Column({ name: 'project', nullable: true })
  project: PlatformEnum | ProtocolName;

  @Column({ name: 'reserve_usd', nullable: true })
  reserveUsd: number;

  @Column({ name: 'apy', nullable: true, type: 'json' })
  apy: APYDto;

  @Column({ name: 'il', nullable: true, type: 'json' })
  il: ImpermanentLossDto;

  @Column({ name: 'token', nullable: true, type: 'json' })
  token: TokenDto;

  @Column({ name: 'pool_tokens', nullable: true, type: 'json' })
  poolTokens: TokenDto[];

  @Column({ name: 'created_at', nullable: true, type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updated_at', nullable: true, type: 'timestamp' })
  updatedAt: Date;
}
