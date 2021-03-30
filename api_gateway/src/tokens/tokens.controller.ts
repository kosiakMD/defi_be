import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import TokenDto from '../DTO/Token.dto';

@ApiTags('Tokens')
@Controller('tokens')
export class TokensController {
	@Get('/')
	@ApiResponse({ status: 200, type: TokenDto, isArray: true })
	get(): TokenDto[] {
		const token = new TokenDto();
		return [token];
	}
}
