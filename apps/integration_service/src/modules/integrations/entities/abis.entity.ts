import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AbiItem } from 'web3-utils';

@Entity({ name: 'int_abis' })
export class AbisEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'abi', type: 'json' })
  abi: AbiItem[];

  @Column({ name: 'hash' })
  hash: string;

  @Column({ name: 'created_at', nullable: false, type: 'timestamp' })
  createdAt: number;
}
