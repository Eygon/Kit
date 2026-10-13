import type { DynamicModule } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { buildDatabaseOptions } from "@/database/database-options";
import { TEST_CONFIG } from "@/__tests__/support/test-config";

export const inMemoryDatabase = (): DynamicModule => TypeOrmModule.forRoot(buildDatabaseOptions(TEST_CONFIG));
