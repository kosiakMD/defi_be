import { Controller, Get } from '@nestjs/common';
import { ApiResponseProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('swap')
@Controller('swap')
export class SwapController {
	@ApiResponseProperty({ type: 'string' })
	@Get('availabletokens')
	get(): string[] {
		return [];
	}
}
