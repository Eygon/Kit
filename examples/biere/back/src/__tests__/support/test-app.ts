import type { AppConfig } from "@/config/app-config";
import type { INestApplication, ModuleMetadata } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import { APP_CONFIG } from "@/config/app-config.constants";
import { TEST_CONFIG } from "@/__tests__/support/test-config";

export const createTestApp = async (
  extraImports: NonNullable<ModuleMetadata["imports"]> = [],
  config: AppConfig = TEST_CONFIG,
): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule, ...extraImports] })
    .overrideProvider(APP_CONFIG)
    .useValue(config)
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app, config);
  await app.init();
  return app;
};
