import { toast } from "@heroui/react";
import type { Mock } from "vitest";
import { HttpError } from "@/api/httpError";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import { DisplayError } from "@/utils/displayError/displayError";

vi.mock("@heroui/react", () => ({ toast: { danger: vi.fn(), success: vi.fn() } }));

const mockToastDanger = toast.danger as unknown as Mock;

describe("DisplayError", () => {
  beforeEach(() => vi.clearAllMocks());

  it("toasts the translation of the error status once", () => {
    DisplayError(new HttpError(HttpStatusCodeEnum.FORBIDDEN, "no"));

    expect(mockToastDanger).toHaveBeenCalledTimes(1);
    expect(mockToastDanger).toHaveBeenCalledWith("Vous n'avez pas accès à cette ressource.");
  });

  it("toasts the generic message for an unknown error", () => {
    DisplayError(new Error("boom"));

    expect(mockToastDanger).toHaveBeenCalledWith("Une erreur est survenue. Réessayez.");
  });

  it("toasts the translation of the key given by the resolver once", () => {
    const error = new HttpError(HttpStatusCodeEnum.BAD_REQUEST, "bad");
    const resolveKey = vi.fn().mockReturnValue("errors.notFound");

    DisplayError(error, resolveKey);

    expect(resolveKey).toHaveBeenCalledWith(error);
    expect(mockToastDanger).toHaveBeenCalledTimes(1);
    expect(mockToastDanger).toHaveBeenCalledWith("La ressource demandée est introuvable.");
  });
});
