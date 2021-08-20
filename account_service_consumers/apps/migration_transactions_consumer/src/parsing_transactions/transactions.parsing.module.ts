import { HttpModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainModule } from '../chain/chain.module';
import { PriceModule } from '../price/price.module';
import { AssetPublisherService } from './asset.publisher.service';
import { AssetsEntity } from './entities/assets.entity';
import { AssetsNewEntity } from './entities/assets.new.entity';
import { TransactionsEntity } from './entities/transactions.entity';
import { MigrationTransactionController } from './migration.transaction.controller';
import { TransactionsParsingService } from './transactions.parsing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssetsEntity, AssetsNewEntity, TransactionsEntity]),
    HttpModule,
    PriceModule,
    ChainModule,
  ],
  providers: [
    TransactionsParsingService,
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
  ],
  controllers: [MigrationTransactionController],
})
export class TransactionsParsingModule {}
