import { ApiProperty } from '@nestjs/swagger';

export class AddressSuggestionDto {
  constructor(address: string, domain?: string) {
    this.address = address;
    this.domain = domain;
  }
  @ApiProperty({ type: String, example: '0xcd2E72aEBe2A203b84f46DEEC948E6465dB51c75' })
  address: string;

  @ApiProperty({ type: String, example: 'beka.eth' })
  domain: string;
}
