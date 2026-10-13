import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core";
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter";
import { createValidationPipe } from "@/common/pipes/validation-pipe.factory";
import { CurrentUserGuard } from "@/common/security/current-user.guard";
import { AppConfigModule } from "@/config/app-config.module";
import { DatabaseModule } from "@/database/database.module";
import { HealthModule } from "@/modules/health/health.module";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [AppConfigModule, DatabaseModule, HealthModule, UsersModule],
  providers: [
    { provide: APP_GUARD, useClass: CurrentUserGuard },
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
