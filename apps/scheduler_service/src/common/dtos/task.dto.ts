// eslint-disable-next-line max-classes-per-file
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { CronExpression, HttpMethod, URLEndpoint } from '../interfaces/task.interfaces';

export class TaskCreateDto {
  @IsNotEmpty()
  //is-url misses localhost and docker host names
  // @IsUrl()
  @IsString()
  @ApiProperty({
    description: 'Webhook Endpoint',
    example: 'http://opportunities-service/sync',
  })
  endpoint: URLEndpoint;

  // TODO: Proper cron entry validation
  @IsNotEmpty()
  // @Validate(CustomCronValidator)
  @IsString()
  @ApiProperty({
    description: 'Cron Expression',
    example: '*/5 * * * *',
  })
  cron: CronExpression;

  @IsOptional()
  @IsString()
  // @Validate(CustomHTTPVerbValidator)
  @ApiProperty({
    description: 'HTTP Method',
    default: 'GET',
  })
  method?: HttpMethod;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: 'Start Task Enabled',
    default: true,
  })
  isActive?: boolean;
}

export class TaskUpdateDto {
  @IsOptional()
  @IsUrl()
  @ApiProperty({
    description: 'Webhook Endpoint',
    example: 'http://opportunities-service/sync',
  })
  endpoint?: URLEndpoint;

  @IsOptional()
  // @Validate(CustomCronValidator)
  @IsString()
  @ApiProperty({
    description: 'Cron Expression',
    example: '*/5 * * * *',
  })
  cron?: CronExpression;

  @IsOptional()
  @IsString()
  // @Validate(CustomHTTPVerbValidator)
  @ApiProperty({
    description: 'HTTP Method',
    default: 'GET',
  })
  method?: HttpMethod;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: 'Start Task Enabled',
    default: true,
  })
  isActive?: boolean;
}
