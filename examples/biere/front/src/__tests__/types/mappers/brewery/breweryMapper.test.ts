import { breweryDtoToModel } from "@/types/mappers/brewery/breweryMapper";

describe("breweryDtoToModel", () => {
  it("maps the id, the name and the country", () => {
    expect(breweryDtoToModel({ id: 4, name: "Chimay", country: "BE" })).toEqual({ id: 4, name: "Chimay", country: "BE" });
  });

  it("keeps a name with spaces and accents as it is and drops any other field", () => {
    const dto = { id: 9, name: " Brasserie d'Orval ", country: "BE", extra: "ignored" };

    expect(breweryDtoToModel(dto)).toEqual({ id: 9, name: " Brasserie d'Orval ", country: "BE" });
  });
});
