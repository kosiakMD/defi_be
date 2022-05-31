import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TaskEntity } from './entities/task.entity';

// import { FarmsTable1644243713467 } from './migrations/1644243713467-FarmsTable';
// import { OpportunitiesTable1644243746992 } from './migrations/1644243746992-OpportunitiesTable';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres',
          host: configService.get('database.host'),
          port: configService.get('database.port'),
          username: configService.get('database.username'),
          password: configService.get('database.password'),
          database: configService.get('database.database'),
          entities: [TaskEntity],
          migrations: [],
          //   migrations: [FarmsTable1644243713467, OpportunitiesTable1644243746992],
          synchronize: configService.get('database.synchronize'),
          logging: configService.get('database.logging'),
        };
      },
    }),
  ],
})
export class DatabaseModule {}
