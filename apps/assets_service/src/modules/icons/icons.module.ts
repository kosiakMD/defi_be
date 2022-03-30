import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigHostModule } from '@nestjs/config/dist/config-host.module';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AwsModule } from '../aws/aws.module';
import { IconSourceEntity } from './entities/IconSources.entity';
import { IconsService } from './icons.service';

@Module({
  imports: [
    AwsModule,
    TypeOrmModule.forFeature([IconSourceEntity]),
    HttpModule.registerAsync({
      imports: [ConfigHostModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get<number>('http.timeout'),
        maxRedirects: configService.get<number>('http.maxRedirects'),
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [IconsService],
  providers: [IconsService],
})
export class IconsModule {}
