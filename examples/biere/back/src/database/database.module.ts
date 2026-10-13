import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import type { AppConfig } from "@/config/app-config";
import { APP_CONFIG } from "@/config/app-config.constants";
import { buildDatabaseOptions } from "@/database/database-options";
import { DataSeeder } from "@/database/data-seeder";
import { User } from "@/modules/users/entities/user.entity";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => buildDatabaseOptions(config),
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [DataSeeder],
})
export class DatabaseModule {}
