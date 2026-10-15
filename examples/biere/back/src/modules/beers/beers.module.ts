import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BeerCorrectionsController } from "@/modules/beers/beer-corrections.controller";
import { CorrectionsController } from "@/modules/beers/corrections.controller";
import { BeerReviewsController } from "@/modules/beers/beer-reviews.controller";
import { BeerStylesController } from "@/modules/beers/beer-styles.controller";
import { BreweriesController } from "@/modules/beers/breweries.controller";
import { BeersController } from "@/modules/beers/beers.controller";
import { BeersRepository } from "@/modules/beers/beers.repository";
import { BeersService } from "@/modules/beers/beers.service";
import { Beer } from "@/modules/beers/entities/beer.entity";
import { BeerCorrection } from "@/modules/beers/entities/beer-correction.entity";
import { BeerCorrectionVote } from "@/modules/beers/entities/beer-correction-vote.entity";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { Brewery } from "@/modules/beers/entities/brewery.entity";
import { Review } from "@/modules/beers/entities/review.entity";
import { TastingsModule } from "@/modules/tastings/tastings.module";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [TypeOrmModule.forFeature([Beer, BeerStyle, Brewery, Review, BeerCorrection, BeerCorrectionVote]), TastingsModule, UsersModule],
  controllers: [BeersController, BeerStylesController, BeerReviewsController, BeerCorrectionsController, CorrectionsController, BreweriesController],
  providers: [BeersService, BeersRepository],
  exports: [BeersService],
})
export class BeersModule {}
