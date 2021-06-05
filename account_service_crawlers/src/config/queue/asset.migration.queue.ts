import { ClientProviderOptions, RmqOptions, Transport } from '@nestjs/microservices';

const migrationQueue = process.env.ASSET_MIGRATION_QUEUE;

const rmqOptions: RmqOptions = {
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL],
  },
};

export const assetQueueOptions: ClientProviderOptions = {
  ...rmqOptions,
  name: migrationQueue,
  options: {
    ...rmqOptions.options,
    queue: migrationQueue,
    noAck: false,
    queueOptions: {
      durable: true,
    },
  },
};
