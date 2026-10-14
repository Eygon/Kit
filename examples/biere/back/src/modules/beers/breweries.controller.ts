import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { BeersService } from "@/modules/beers/beers.service";
import type { BreweryDto } from "@/modules/beers/dtos/brewery.dto";

@Controller("breweries")
export class BreweriesController {
  constructor(private readonly beersService: BeersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getAll(): Promise<BreweryDto[]> {
    return this.beersService.getBreweries();
  }
}
