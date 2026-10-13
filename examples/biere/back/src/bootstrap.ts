import { NestFactory } from "@nestjs/core";
import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import type { AppConfig } from "@/config/app-config";
import { APP_CONFIG } from "@/config/app-config.constants";

export const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule);
  const config = app.get<AppConfig>(APP_CONFIG);
  configureApp(app, config);
  await app.listen(config.port);
};
