import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { NetworksController } from '../networks/networks.controller.dto';
import { PartnersController } from '../partners/partners.controller';
import { ProjectsController } from '../projects/projects.controller';
import { ScamsController } from '../scams/scams.controller.dto';
import { SafeProxyService } from './safe.proxy.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [SafeProxyService],
  controllers: [NetworksController, PartnersController, ProjectsController, ScamsController],
})
export class SafeProxyModule {}
