import { IsNumber } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { EndpointCallScore } from '../../modules/endpoints/endpoints.enums';
import { SuccessScore } from '../../modules/endpoints/endpoints.types';

export class CallsStatistic {
  private readonly rating: number;

  constructor(scores: SuccessScore[] = []) {
    scores.forEach((score) => {
      if (score.value === EndpointCallScore.success) {
        this.success += 1;
      }
      if (score.value === EndpointCallScore.fail) {
        this.fail += 1;
      }
    });

    const total = this.success + this.fail;
    if (total <= 0) {
      this.rating = 0;
    }
    // NOTE: If number of calls is low give it some chance to execute
    if (total <= 5) {
      this.rating = 1;
    } else {
      this.rating = this.success / total;
    }
  }

  @ApiProperty({ type: Number, required: true, example: 12 })
  @IsNumber()
  fail: number;

  @ApiProperty({ type: Number, required: true, example: 144 })
  @IsNumber()
  success: number;

  @ApiProperty({ type: Number, required: true, example: 132 })
  @IsNumber()
  get successRating() {
    return this.rating;
  }
}
