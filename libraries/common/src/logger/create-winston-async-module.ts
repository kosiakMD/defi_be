// import { ConfigModule, ConfigService } from "@nestjs/config";
// import { WinstonModule } from "nest-winston";
// import { getWinstonParams } from "@app/common/logger/logger.config";
// TODO handle problems with import
// export const createServiceWinstonAsyncModule = (
//   identifier: string,
//   ConfigModule: ConfigModule,
//   ConfigService: ConfigService,
// ) =>
//   WinstonModule.forRootAsync({
//     imports: [ConfigModule],
//     inject: [ConfigService],
//     useFactory: async (configService: ConfigService) => getWinstonParams(identifier, configService),
//   });
