import { BadRequestException } from "@nestjs/common";
import type { ValidationError } from "class-validator";
import { describe, expect, it } from "vitest";
import { createValidationException } from "@/common/exceptions/validation-exception.factory";

describe("createValidationException", () => {
  it("flattens every constraint, nested ones included, into one message string", () => {
    const errors: ValidationError[] = [
      { property: "name", constraints: { isNotEmpty: "name should not be empty" }, children: [] },
      {
        property: "brewery",
        children: [{ property: "city", constraints: { isString: "city must be a string" }, children: [] }],
      },
    ];

    const exception = createValidationException(errors);

    expect(exception).toBeInstanceOf(BadRequestException);
    expect(exception.getResponse()).toMatchObject({
      message: "name should not be empty; city must be a string",
    });
  });
});
