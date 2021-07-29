import { ClientProviderOptions, RmqOptions, Transport } from '@nestjs/microservices';

const migrationQueue = process.env.TRANSACTION_EVENTS_MIGRATION_QUEUE;

// setup the RabbitMQ connection
const rmqOptions: RmqOptions = {
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL],
  },
};

const migrationQueueOptions: ClientProviderOptions = {
  ...rmqOptions,
  name: migrationQueue,
  options: {
    ...rmqOptions.options,
    queue: migrationQueue,
    prefetchCount: 1,
    noAck: false,
    queueOptions: {
      durable: true,
    },
  },
};

export const queueOptions = {
  migrationQueueOptions,
};
