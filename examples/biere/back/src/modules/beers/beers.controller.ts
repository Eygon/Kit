import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import { BeersService } from "@/modules/beers/beers.service";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import { BeersQueryDto } from "@/modules/beers/dtos/beers-query.dto";
import { CreateBeerDto } from "@/modules/beers/dtos/create-beer.dto";
import type { BeerDetailDto } from "@/modules/beers/dtos/beer-detail.dto";

@Controller("beers")
export class BeersController {
  constructor(private readonly beersService: BeersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getAll(@CurrentUserId() userId: number, @Query() query: BeersQueryDto): Promise<BeerPageDto> {
    return this.beersService.getBeers(userId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUserId() userId: number, @Body() dto: CreateBeerDto): Promise<BeerDetailDto> {
    return this.beersService.createBeer(userId, dto);
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  getOne(@CurrentUserId() userId: number, @Param("id", ParseIntPipe) id: number): Promise<BeerDetailDto> {
    return this.beersService.getBeerForUser(userId, id);
  }
}
