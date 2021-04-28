import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ArrayValidationParseIntPipe implements PipeTransform<string[], number[]> {
  private readonly errMsg = (field): string =>
    `Validation failed: each value in "${field}" must be an integer number (could be stringified)`;

  constructor(private readonly field: string, private readonly radix: number = 10) {}

  transform(value: any): number[] {
    if (!Array.isArray(value[this.field])) {
      throw new BadRequestException(this.errMsg(this.field));
    }
    try {
      value[this.field] = value[this.field].map((x) => {
        const result = parseInt(x, this.radix);
        if (!Number.isInteger(result)) {
          throw new BadRequestException(this.errMsg(this.field));
        }
        return result;
      });
    } catch (e) {
      throw new BadRequestException(this.errMsg(this.field));
    }
    return value;
  }
}
