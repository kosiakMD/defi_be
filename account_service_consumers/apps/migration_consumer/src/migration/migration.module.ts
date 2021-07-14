import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport, ClientProxy } from '@nestjs/microservices';

import { StoreModule } from '../store/store.module';
import { AssetPublisherService } from './asset.publisher.service';
import { MigrationController } from './migration.controller';
import { MigrationService } from './migration.service';

@Module({
  imports: [StoreModule],
  controllers: [MigrationController],
  providers: [
    AssetPublisherService,
    {
      provide: 'TRANSACTION_NEW_ASSET_ADDED_CLIENT',
      useFactory: (configService: ConfigService): ClientProxy => {
        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: configService.get<string>('TRANSACTION_NEW_ASSET_ADDED'),
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
    MigrationService,
  ],
  exports: [MigrationService],
})
export class MigrationModule {}
