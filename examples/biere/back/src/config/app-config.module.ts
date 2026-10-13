import { Global, Module } from "@nestjs/common";
import { loadAppConfig } from "@/config/app-config";
import { APP_CONFIG } from "@/config/app-config.constants";

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => loadAppConfig(process.env) }],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
