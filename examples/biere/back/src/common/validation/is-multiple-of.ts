import { ValidateBy } from "class-validator";

export const IsMultipleOf = (step: number) =>
  ValidateBy({
    name: "isMultipleOf",
    constraints: [step],
    validator: {
      validate: (value: unknown): boolean => typeof value === "number" && value % step === 0,
      defaultMessage: (args) => `${args?.property} must be divisible by ${step}`,
    },
  });
