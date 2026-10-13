import { Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Query } from "@nestjs/common";
import type { BeerVenueDto } from "@/modules/venues/dtos/beer-venue.dto";
import { PositionQueryDto } from "@/modules/venues/dtos/position-query.dto";
import { VenuesService } from "@/modules/venues/venues.service";

@Controller("beers/:beerId/venues")
export class BeerVenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getAll(@Param("beerId", ParseIntPipe) beerId: number, @Query() query: PositionQueryDto): Promise<BeerVenueDto[]> {
    return this.venuesService.getBeerVenues(beerId, query);
  }
}
