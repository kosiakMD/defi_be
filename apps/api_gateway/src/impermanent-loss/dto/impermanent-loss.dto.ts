// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

export class ImpermanentLossDto {
  @ApiProperty({ type: Number, example: 51 })
  Asset1: number;

  @ApiProperty({ type: String, example: 'YFV' })
  Asset1Name: string;

  @ApiProperty({ type: Number, example: 49 })
  Asset2: number;

  @ApiProperty({ type: String, example: 'BAL' })
  Asset2Name: string;

  @ApiProperty({ type: Number, example: 11 })
  Asset3: number;

  @ApiProperty({ type: Number, example: 22 })
  Asset4: number;

  @ApiProperty({ type: Number, example: 8 })
  Asset5: number;

  @ApiProperty({ type: Number, example: 8 })
  Asset6: number;

  @ApiProperty({ type: Number, example: 1.53 })
  asset1Coingecko: number;

  @ApiProperty({ type: Number, example: 19.67 })
  asset2Coingecko: number;

  @ApiProperty({ type: Number, example: 1111.0 })
  depositValue: number;
}

export class ImpermanentLossElemDto {
  @ApiProperty({ type: Number, example: 0 })
  id: number;

  @ApiProperty({ type: String, example: '#' })
  value: string;
}

export class ImpermanentLossResponseDto {
  @ApiProperty({
    type: Array,
    example: [
      [
        {
          id: 0,
          value: '#',
        },
        {
          id: 1,
          value: 'Price Action (Compounded)',
        },
        {
          id: 2,
          value: '$YFV Price',
        },
        {
          id: 3,
          value: 'YFV Start Amount',
        },
        {
          id: 4,
          value: 'YFV $Value',
        },
        {
          id: 5,
          value: 'YFV Share in the pool',
        },
        {
          id: 6,
          value: '$BAL Price',
        },
        {
          id: 7,
          value: 'BAL Start Amount',
        },
        {
          id: 8,
          value: 'BAL $Value',
        },
        {
          id: 9,
          value: 'BAL $Share in the pool',
        },
        {
          id: 10,
          value: 'Action YFV (+buy, - sell)',
        },
        {
          id: 11,
          value: 'Action BAL  (+buy, - sell)',
        },
        {
          id: 12,
          value: 'YFV New Balance',
        },
        {
          id: 13,
          value: 'BAL New Balance',
        },
        {
          id: 14,
          value: 'YFV Loss / Gain',
        },
        {
          id: 15,
          value: 'BAL Loss / Gain',
        },
        {
          id: 16,
          value: 'YFV $Value Loss / Gain',
        },
        {
          id: 17,
          value: 'BAL $Value Loss / Gain',
        },
        {
          id: 18,
          value: 'Pool $Value',
        },
        {
          id: 19,
          value: 'Pool $Value Loss / Gain',
        },
        {
          id: 20,
          value: 'Pool Value Loss / Gain %',
        },
        {
          id: 21,
          value: '$Loss / Gains at Simple Holding of Initial Amounts',
        },
        {
          id: 22,
          value: 'Spiral IL',
        },
      ],
      [
        {
          id: 0,
          value: 0,
        },
        {
          id: 1,
          value: 'initial step',
        },
        {
          id: 2,
          value: '$1.53',
        },
        {
          id: 3,
          value: '370.33',
        },
        {
          id: 4,
          value: '$566.61',
        },
        {
          id: 5,
          value: '51%',
        },
        {
          id: 6,
          value: '$19.67',
        },
        {
          id: 7,
          value: '27.68',
        },
        {
          id: 8,
          value: '$544.39',
        },
        {
          id: 9,
          value: '$0.49',
        },
        {
          id: 10,
          value: '-0.0',
        },
        {
          id: 11,
          value: '0.0',
        },
        {
          id: 12,
          value: '370.33',
        },
        {
          id: 13,
          value: '27.68',
        },
        {
          id: 14,
          value: '-0.0',
        },
        {
          id: 15,
          value: '0.0',
        },
        {
          id: 16,
          value: '0.00',
        },
        {
          id: 17,
          value: '0.00',
        },
        {
          id: 18,
          value: '$1,111.00',
        },
        {
          id: 19,
          value: '$0.00',
        },
        {
          id: 20,
          value: '0%',
        },
        {
          id: 21,
          value: '$0.00',
        },
        {
          id: 22,
          value: '0.00%',
        },
      ],
    ],
  })
  result: ImpermanentLossElemDto[][];
}
