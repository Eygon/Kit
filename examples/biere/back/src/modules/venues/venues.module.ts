import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BeersModule } from "@/modules/beers/beers.module";
import { BeerVenuesController } from "@/modules/venues/beer-venues.controller";
import { AvailabilityVote } from "@/modules/venues/entities/availability-vote.entity";
import { Venue } from "@/modules/venues/entities/venue.entity";
import { VenueBeer } from "@/modules/venues/entities/venue-beer.entity";
import { VenuesController } from "@/modules/venues/venues.controller";
import { VenuesRepository } from "@/modules/venues/venues.repository";
import { VenuesService } from "@/modules/venues/venues.service";

@Module({
  imports: [TypeOrmModule.forFeature([Venue, VenueBeer, AvailabilityVote]), BeersModule],
  controllers: [VenuesController, BeerVenuesController],
  providers: [VenuesService, VenuesRepository],
})
export class VenuesModule {}
