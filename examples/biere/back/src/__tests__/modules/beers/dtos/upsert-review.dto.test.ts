import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { UpsertReviewDto } from "@/modules/beers/dtos/upsert-review.dto";

const validateBody = async (body: Record<string, unknown>) => {
  const dto = plainToInstance(UpsertReviewDto, body) as { text?: string };
  const errors = await validate(dto as object, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, messages: errors.flatMap((error) => Object.values(error.constraints ?? {})) };
};

describe("UpsertReviewDto", () => {
  it("accepts a rating alone", async () => {
    expect((await validateBody({ rating: 3 })).messages).toEqual([]);
  });

  it("accepts a rating and a text", async () => {
    expect((await validateBody({ rating: 4.5, text: "Superbe amertume" })).messages).toEqual([]);
  });

  it.each([1, 1.5, 4.5, 5])("accepts the rating %s", async (rating) => {
    expect((await validateBody({ rating })).messages).toEqual([]);
  });

  it.each([
    ["a missing rating", {}],
    ["a rating of 0", { rating: 0 }],
    ["a rating of 0.5", { rating: 0.5 }],
    ["a rating of 5.5", { rating: 5.5 }],
    ["a rating of 3.3", { rating: 3.3 }],
    ["a rating sent as a string", { rating: "4" }],
    ["a sweetness of 2", { rating: 3, sweetness: 2 }],
    ["an acidity of 3", { rating: 3, acidity: 3 }],
    ["a body of 4", { rating: 3, body: 4 }],
    ["a null sweetness", { rating: 3, sweetness: null }],
    ["a null acidity", { rating: 3, acidity: null }],
    ["a null body", { rating: 3, body: null }],
    ["a text of 501 characters", { rating: 3, text: "a".repeat(501) }],
    ["a text that is not a string", { rating: 3, text: 12 }],
    ["an unknown field", { rating: 3, authorId: 2 }],
  ])("rejects %s", async (_label, body) => {
    expect((await validateBody(body)).messages.length).toBeGreaterThan(0);
  });

  it.each(["sweetness", "acidity", "body"])("names the criterion %s as a property that should not exist", async (criterion) => {
    expect((await validateBody({ rating: 3, [criterion]: 2 })).messages).toEqual([`property ${criterion} should not exist`]);
  });

  it("accepts 500 characters written with CRLF after normalization and rejects 501", async () => {
    const accepted = await validateBody({ rating: 3, text: `${"a".repeat(249)}\r\n${"b".repeat(249)}\r\n` });

    expect(accepted.messages).toEqual([]);
    expect(accepted.dto.text).toBe(`${"a".repeat(249)}\n${"b".repeat(249)}`);
    expect((await validateBody({ rating: 3, text: `${"a".repeat(250)}\r\n${"b".repeat(250)}` })).messages.length).toBeGreaterThan(0);
  });

  it("trims the text before the length check", async () => {
    const accepted = await validateBody({ rating: 3, text: `  ${"a".repeat(500)}  ` });

    expect(accepted.messages).toEqual([]);
    expect(accepted.dto.text).toBe("a".repeat(500));
    expect((await validateBody({ rating: 3, text: ` ${"a".repeat(501)} ` })).messages.length).toBeGreaterThan(0);
  });
});
