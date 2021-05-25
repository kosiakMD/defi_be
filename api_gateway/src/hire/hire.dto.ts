// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

import { HireEmailResponse, HireRequest } from './hire.interface';

export class HireEmailRequestDto implements HireRequest {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    type: String,
    required: true,
    description: 'Email address',
    default: 'test@gmail.com',
  })
  address: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    type: String,
    required: true,
    description: 'Applicant name',
    default: 'John Deer',
  })
  name: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    type: String,
    required: true,
    description: 'Cover letter',
    default: 'I am a very cool developer!',
  })
  letter: string;
}

export class HireEmailResponseDto implements HireEmailResponse {
  @ApiProperty({ type: String, isArray: true, example: ['hr@defiyield.app'] })
  'accepted';

  @ApiProperty({ type: String, isArray: true, example: [] })
  'rejected';

  @ApiProperty({ type: Number, isArray: true, example: 388 })
  'envelopeTime';

  @ApiProperty({ type: Number, isArray: true, example: 614 })
  'messageTime';

  @ApiProperty({ type: Number, isArray: true, example: 587 })
  'messageSize';

  @ApiProperty({
    type: String,
    isArray: true,
    example: '250 2.0.0 OK  1621892223 q19sm560547lff.281 - gsmtp',
  })
  'response';

  @ApiProperty({
    type: Object,
    isArray: true,
    example: {
      from: 'hr@defiyield.app',
      to: ['hr@defiyield.app'],
    },
  })
  'envelope';

  @ApiProperty({
    type: String,
    isArray: true,
    example: '<ad93b044-12fe-0a1b-b41a-250bb05e7016@defiyield.app>',
  })
  'messageId';
}

export class HireEmailValidationErrorResponseDto {
  @ApiProperty({ type: Number, example: 400 })
  statusCode;
  @ApiProperty({
    type: String,
    isArray: true,
    example: [
      'address must be an email',
      'name must be a string',
      'letter must be a string',
      'letter should not be empty',
    ],
  })
  message;
  @ApiProperty({ type: String, example: 'Bad Request' })
  error;
}
