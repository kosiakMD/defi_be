import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { HireController } from './hire.controller';
import { HireService } from './hire.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: `smtp://${configService.get<string>('MAILER_USER')}:${configService.get<string>(
          'MAILER_PASS',
        )}@${configService.get<string>('MAILER_HOST')}`,
        defaults: {
          from: '"nest-modules" <modules@nestjs.com>',
        },
      }),
    }),
  ],
  controllers: [HireController],
  providers: [HireService],
})
export class HireModule {}
