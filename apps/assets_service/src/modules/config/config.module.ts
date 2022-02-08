import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from '@app/common/config/configuration';

import config from '../../config';
import databaseConfig from './database.config';
import httpConfig from './http.config';
import redisConfig from './redis.config';

const load = [databaseConfig, redisConfig, httpConfig];

@Module({
  imports: [ConfigModule.forRoot({ ...configuration(config), load })],
})
export class ConfigurationModule {}
