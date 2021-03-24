import { Controller, Get } from '@nestjs/common';
import { ApiResponseProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('Swap')
@Controller('swap')
export class SwapController {
	@ApiResponseProperty({ type: String })
	@Get('availabletokens')
	get(): string[] {
		return [];
	}
}
