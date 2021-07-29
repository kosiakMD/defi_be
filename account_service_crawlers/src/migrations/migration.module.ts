import { HttpModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport, ClientProxy } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NodeModule } from '../node/node.module';
import { AssetPublisherService } from './asset.publisher.service';
import { AssetsService } from './assets.service';
import { AssetsEntity } from './entities/assets.entity';
import { BlocksInfoEntity } from './entities/eth/blocks.info.entity';
import { EthBlockEntity } from './entities/eth/eth.block.entity';
import { EthEventsEntity } from './entities/eth/eth.events.entity';
import { EthTransactionsEntity } from './entities/eth/eth.transactions.entity';
import { SettingsEntity } from './entities/settings.entity';
import { MigrationEventService } from './migration.event.service';
import { MigrationService } from './migration.service';
import { SqlService } from './sql.service';

@Module({
  imports: [
    ConfigService,
    TypeOrmModule.forFeature([
      EthEventsEntity,
      BlocksInfoEntity,
      EthBlockEntity,
      EthTransactionsEntity,
      AssetsEntity,
      SettingsEntity,
    ]),
    HttpModule,
    NodeModule,
  ],
  providers: [
    MigrationService,
    MigrationEventService,
    SqlService,
    AssetPublisherService,
    AssetsService,
    {
      provide: 'ASSET_MIGRATION_CLIENT',
      useFactory: (configService: ConfigService): ClientProxy => {
        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: configService.get<string>('ASSET_MIGRATION_QUEUE'),
            isGlobalPrefetchCount: false,
            prefetchCount: 1,
            noAck: false,
            persistent: true,
            queueOptions: {
              durable: true,
            },
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'ASSET_HISTORICAL_MIGRATION_CLIENT',
      useFactory: (configService: ConfigService): ClientProxy => {
        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: configService.get<string>('ASSET_HISTORICAL_MIGRATION_QUEUE'),
            isGlobalPrefetchCount: false,
            prefetchCount: 1,
            noAck: false,
            persistent: true,
            queueOptions: {
              durable: true,
            },
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'TRANSACTION_EVENTS_MIGRATION_CLIENT',
      useFactory: (configService: ConfigService): ClientProxy => {
        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: configService.get<string>('TRANSACTION_EVENTS_MIGRATION_QUEUE'),
            isGlobalPrefetchCount: false,
            prefetchCount: 1,
            noAck: false,
            persistent: true,
            queueOptions: {
              durable: true,
            },
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [MigrationService, MigrationEventService],
})
export class MigrationModule {}
