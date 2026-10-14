import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BeerReviewsController } from "@/modules/beers/beer-reviews.controller";
import { BeerStylesController } from "@/modules/beers/beer-styles.controller";
import { BeersController } from "@/modules/beers/beers.controller";
import { BeersRepository } from "@/modules/beers/beers.repository";
import { BeersService } from "@/modules/beers/beers.service";
import { Beer } from "@/modules/beers/entities/beer.entity";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { Brewery } from "@/modules/beers/entities/brewery.entity";
import { Review } from "@/modules/beers/entities/review.entity";
import { TastingsModule } from "@/modules/tastings/tastings.module";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [TypeOrmModule.forFeature([Beer, BeerStyle, Brewery, Review]), TastingsModule, UsersModule],
  controllers: [BeersController, BeerStylesController, BeerReviewsController],
  providers: [BeersService, BeersRepository],
  exports: [BeersService],
})
export class BeersModule {}
