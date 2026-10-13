import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import type { DexDto } from "@/modules/pokedex/dtos/dex.dto";
import { PokedexService } from "@/modules/pokedex/pokedex.service";

@Controller("me/dex")
export class DexController {
  constructor(private readonly pokedexService: PokedexService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  get(@CurrentUserId() userId: number): Promise<DexDto> {
    return this.pokedexService.getDex(userId);
  }
}
