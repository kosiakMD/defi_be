import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BlocksSubgraph } from './blocks/blocks.subgraph';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
    ConfigModule.forRoot(),
  ],
  providers: [BlocksSubgraph],
  exports: [BlocksSubgraph],
})
export class ThegraphModule {}
