import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AavegotchiSubgraph } from './aavegotchi/aavegotchi.subgraph';
import { BlocksSubgraph } from './blocks/blocks.subgraph';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
    ConfigModule.forRoot(),
  ],
  providers: [BlocksSubgraph, AavegotchiSubgraph],
  exports: [BlocksSubgraph, AavegotchiSubgraph],
})
export class ThegraphModule {}
