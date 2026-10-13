import { Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Query } from "@nestjs/common";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import { BeersService } from "@/modules/beers/beers.service";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import { BeersQueryDto } from "@/modules/beers/dtos/beers-query.dto";
import type { CatalogBeerDto } from "@/modules/beers/dtos/catalog-beer.dto";

@Controller("beers")
export class BeersController {
  constructor(private readonly beersService: BeersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getAll(@CurrentUserId() userId: number, @Query() query: BeersQueryDto): Promise<BeerPageDto> {
    return this.beersService.getBeers(userId, query);
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  getOne(@CurrentUserId() userId: number, @Param("id", ParseIntPipe) id: number): Promise<CatalogBeerDto> {
    return this.beersService.getBeerForUser(userId, id);
  }
}
