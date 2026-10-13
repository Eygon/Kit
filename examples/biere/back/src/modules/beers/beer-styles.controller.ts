import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { BeersService } from "@/modules/beers/beers.service";
import type { BeerStyleGroupDto } from "@/modules/beers/dtos/beer-style-group.dto";

@Controller("beer-styles")
export class BeerStylesController {
  constructor(private readonly beersService: BeersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getAll(): Promise<BeerStyleGroupDto[]> {
    return this.beersService.getStyleGroups();
  }
}
