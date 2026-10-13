import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import { CreateVenueDto } from "@/modules/venues/dtos/create-venue.dto";
import { CreateVoteDto } from "@/modules/venues/dtos/create-vote.dto";
import { ReportVenueBeerDto } from "@/modules/venues/dtos/report-venue-beer.dto";
import type { VenueBeerDto } from "@/modules/venues/dtos/venue-beer.dto";
import { VenueBeersQueryDto } from "@/modules/venues/dtos/venue-beers-query.dto";
import type { VenueDto } from "@/modules/venues/dtos/venue.dto";
import { VenuesQueryDto } from "@/modules/venues/dtos/venues-query.dto";
import { VenuesService } from "@/modules/venues/venues.service";

@Controller("venues")
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getAll(@Query() query: VenuesQueryDto): Promise<VenueDto[]> {
    return this.venuesService.getVenues(query);
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  getOne(@Param("id", ParseIntPipe) id: number): Promise<VenueDto> {
    return this.venuesService.getVenue(id);
  }

  @Get(":id/beers")
  @HttpCode(HttpStatus.OK)
  getBeers(
    @CurrentUserId() userId: number,
    @Param("id", ParseIntPipe) id: number,
    @Query() query: VenueBeersQueryDto,
  ): Promise<VenueBeerDto[]> {
    return this.venuesService.getVenueBeers(userId, id, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateVenueDto): Promise<VenueDto> {
    return this.venuesService.createVenue(dto);
  }

  @Post(":id/beers")
  @HttpCode(HttpStatus.CREATED)
  reportBeer(@Param("id", ParseIntPipe) id: number, @Body() dto: ReportVenueBeerDto): Promise<VenueBeerDto> {
    return this.venuesService.reportBeer(id, dto);
  }

  @Post(":id/beers/:beerId/votes")
  @HttpCode(HttpStatus.CREATED)
  vote(
    @CurrentUserId() userId: number,
    @Param("id", ParseIntPipe) id: number,
    @Param("beerId", ParseIntPipe) beerId: number,
    @Body() dto: CreateVoteDto,
  ): Promise<VenueBeerDto> {
    return this.venuesService.vote(userId, id, beerId, dto);
  }
}
