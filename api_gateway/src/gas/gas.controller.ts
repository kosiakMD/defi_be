import { Controller, Get } from "@nestjs/common";
import { GasHistoryDto, GasPriceDto } from "../DTO/Gas.dto";
import { GasHistory, GasPrice } from "../interfaces";
import { ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags('Gas')
@Controller("gas")
export class GasController {
	@Get("/current_price")
	@ApiResponse({ status: 200, type: GasPriceDto })
	getCurrentPrice(): GasPrice {
		return new GasPriceDto();
	}

	@Get("/history")
	@ApiResponse({ status: 200, type: GasHistoryDto, isArray: true })
	getHistory(): GasHistory[] {
		const gasHistoryUnit = new GasHistoryDto();
		return [gasHistoryUnit];
	}

	@Get("/cost")
	@ApiResponse({ status: 200, type: Number })
	getCost(): number {
		// TODO: gasUsed * gasPrice to ETH
		return 0;
	}
}
