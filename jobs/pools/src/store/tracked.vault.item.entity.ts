import { Expose } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tracked_vault_item' })
export class TrackedVaultItem {
  @Expose()
  @PrimaryGeneratedColumn({ name: 'id' }) // in this case the repository returns updated entity in save method
  id: number;

  @Expose()
  @Column({ name: 'id_unique' })
  idUnique: string;

  @Expose()
  @Column({ name: 'type' })
  type: string;

  @Expose()
  @Column({ name: 'name' })
  name: string;

  @Expose()
  @Column({ name: 'data', type: 'json' })
  data: any;

  @Expose()
  @Column({ name: 'created_at' })
  createdAt: Date;

  @Expose()
  @Column({ name: 'updated_at' })
  updatedAt: Date;
}
