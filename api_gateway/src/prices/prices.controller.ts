import { Controller, Get, Param, ParseArrayPipe, Query } from "@nestjs/common";
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";

enum KeysEnum {
	tokens = "tokens",
	balancer = "balancer",
	curve = "curve",
	sushiswap = "sushiswap",
	uniswap = "uniswap",
}

@ApiTags("Prices")
@Controller("prices")
export class PricesController {
	@Get("/")
	@ApiQuery({
		name: "tokens",
		type: String,
		description: "comma-separated Array String"
	})
	@ApiResponse({ status: 200, type: String })
	get(
		@Query("tokens", new ParseArrayPipe({ items: String, separator: "," }))
			tokens: string[]
	): string[] {
		return tokens.map((token) => token.toLowerCase());
	}

	@Get("/historical/:key")
	@ApiParam({
		name: "key",
		enum: KeysEnum
	})
	@ApiQuery({
		name: "tokenAddress",
		type: String,
		description: "Token address"
	})
	@ApiQuery({
		name: "timestamps",
		type: String,
		isArray: true,
		description: "DateString"
	})
	@ApiResponse({ status: 200, type: String, isArray: true })
	getHistory(
		@Param("key") key: KeysEnum = KeysEnum.tokens,
		@Query("tokenAddress") tokenAddress: string,
		@Query("timestamps", new ParseArrayPipe({ items: String, separator: "," })) timestamps: string[]
	): string[] {
		return [key, tokenAddress, ...timestamps];
	}
}
