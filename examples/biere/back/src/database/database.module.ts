import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import type { AppConfig } from "@/config/app-config";
import { APP_CONFIG } from "@/config/app-config.constants";
import { buildDatabaseOptions } from "@/database/database-options";
import { DataSeeder } from "@/database/data-seeder";
import { Beer } from "@/modules/beers/entities/beer.entity";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { Brewery } from "@/modules/beers/entities/brewery.entity";
import { User } from "@/modules/users/entities/user.entity";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => buildDatabaseOptions(config),
    }),
    TypeOrmModule.forFeature([User, BeerStyle, Brewery, Beer]),
  ],
  providers: [DataSeeder],
})
export class DatabaseModule {}
