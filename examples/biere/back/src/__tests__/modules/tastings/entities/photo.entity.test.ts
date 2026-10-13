import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";
import { Photo } from "@/modules/tastings/entities/photo.entity";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

describe("Photo entity", () => {
  it("maps the photos table with a uuid id, a typed content type, a blob and no relation", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Photo])],
    }).compile();
    const metadata = moduleRef.get(DataSource).getMetadata(Photo);
    const byName = (name: string) => metadata.columns.find((column) => column.propertyName === name);

    expect(metadata.tableName).toBe("photos");
    expect(metadata.columns.map((column) => column.propertyName).sort()).toEqual(["content", "contentType", "id"]);
    expect(byName("id")?.isPrimary).toBe(true);
    expect(byName("id")?.generationStrategy).toBe("uuid");
    expect(byName("contentType")?.type).toBe("simple-enum");
    expect(byName("contentType")?.enum).toEqual(["image/jpeg", "image/png", "image/webp"]);
    expect(byName("contentType")?.isNullable).toBe(false);
    expect(byName("content")?.type).toBe("blob");
    expect(byName("content")?.isNullable).toBe(false);
    expect(metadata.relations).toEqual([]);

    await moduleRef.close();
  });
});
