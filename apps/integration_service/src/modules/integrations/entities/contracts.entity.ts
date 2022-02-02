import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AbisEntity } from './abis.entity';
import { ProjectsEntity } from './projects.entity';
import { VaultsEntity } from './vaults.entity';

@Entity({ name: 'int_contracts' })
export class ContractsEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'address' })
  address: string;

  @Column({ name: 'chain_id' })
  chainId: number;

  @OneToOne(() => AbisEntity)
  @JoinColumn({ name: 'abi_hash', referencedColumnName: 'hash' })
  @Column({ name: 'abi_hash', type: 'json' })
  abi: AbisEntity;

  @OneToMany(() => VaultsEntity, (vault) => vault.contract)
  vaults: VaultsEntity[];

  @ManyToOne(() => ProjectsEntity, (project) => project.contracts)
  @JoinColumn({ name: 'project_id', referencedColumnName: 'id' })
  @Column({ name: 'project_id', type: 'integer' })
  project: ProjectsEntity;

  @Column({ name: 'created_at', nullable: false, type: 'timestamp' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'timestamp' })
  updatedAt: number;
}
