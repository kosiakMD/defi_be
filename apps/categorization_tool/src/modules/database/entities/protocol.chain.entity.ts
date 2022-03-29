import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Chain } from './chain.entity';
import { Protocol } from './protocol.entity';

@Entity({ name: 'protocols_chains' })
export class ProtocolChain {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ManyToOne(() => Protocol, (p) => p.protocolChains)
  @JoinColumn({ name: 'protocol_id' })
  protocol: Protocol;

  @ManyToOne(() => Chain, (c) => c.protocolChains, { eager: true })
  @JoinColumn({ name: 'chain_id' })
  chain: Chain;
}
