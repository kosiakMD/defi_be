import { ApiProperty } from '@nestjs/swagger';

import { ERC20Token } from '@app/common/dto/erc20-token';

export class BaseTokenDto extends ERC20Token {
  @ApiProperty({ type: [BaseTokenDto] })
  tokens?: BaseTokenDto[]; // underlying tokens
}
