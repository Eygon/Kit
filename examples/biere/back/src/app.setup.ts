import type { INestApplication } from "@nestjs/common";
import { API_PREFIX, CORS_ALLOWED_HEADERS, CORS_ALLOWED_METHODS } from "@/app.constants";
import type { AppConfig } from "@/config/app-config";

export const configureApp = (app: INestApplication, config: AppConfig): INestApplication => {
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors({
    origin: [...config.corsOrigins],
    allowedHeaders: [...CORS_ALLOWED_HEADERS],
    methods: [...CORS_ALLOWED_METHODS],
  });
  return app;
};
