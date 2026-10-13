import { ValidationPipe } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { createValidationPipe } from "@/common/pipes/validation-pipe.factory";

describe("createValidationPipe", () => {
  it("builds a whitelisting, transforming ValidationPipe", () => {
    const pipe = createValidationPipe();

    expect(pipe).toBeInstanceOf(ValidationPipe);
    expect(pipe).toMatchObject({ isTransformEnabled: true });
    expect(Reflect.get(pipe, "validatorOptions")).toMatchObject({ whitelist: true, forbidNonWhitelisted: true });
  });
});
