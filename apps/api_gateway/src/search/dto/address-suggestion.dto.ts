import { ApiProperty } from '@nestjs/swagger';

export class AddressSuggestionDto {
  constructor(address: string) {
    this.address = address;
  }
  @ApiProperty({ type: String, example: '0xcd2E72aEBe2A203b84f46DEEC948E6465dB51c75' })
  address: string;
}
