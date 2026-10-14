import "reflect-metadata";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { IsMultipleOf } from "@/common/validation/is-multiple-of";

const buildProbe = async (step: number, value: unknown) => {
  class Probe {
    @IsMultipleOf(step)
    readonly amount!: unknown;
  }
  const probe = new Probe();
  Object.assign(probe, { amount: value });
  return validate(probe);
};

describe("IsMultipleOf", () => {
  it.each([0, 0.5, 4.5, 5])("accepts %s for a step of 0.5", async (value) => {
    expect(await buildProbe(0.5, value)).toEqual([]);
  });

  it.each([3.3, 4.2, 0.25])("rejects %s for a step of 0.5 with the divisibility message", async (value) => {
    const errors = await buildProbe(0.5, value);

    expect(errors.flatMap((error) => Object.values(error.constraints ?? {}))).toEqual([
      "amount must be divisible by 0.5",
    ]);
  });

  it.each(["4", null, undefined, Number.NaN])("rejects the non-number %s", async (value) => {
    expect(await buildProbe(0.5, value)).toHaveLength(1);
  });

  it("uses the step it receives", async () => {
    expect(await buildProbe(2, 4)).toEqual([]);
    expect(await buildProbe(2, 3)).toHaveLength(1);
  });
});
