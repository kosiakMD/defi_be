import { NetworksController } from 'src/networks/networks.controller.dto';
import { PartnersController } from 'src/partners/partners.controller';
import { ProjectsController } from 'src/projects/projects.controller';
import { ScamsController } from 'src/scams/scams.controller.dto';

import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SafeProxyService } from './safe.proxy.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [SafeProxyService],
  controllers: [NetworksController, PartnersController, ProjectsController, ScamsController],
})
export class SafeProxyModule {}
