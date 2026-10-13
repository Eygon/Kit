import { RoutePathEnum } from "@/types/enums/routing/routePathEnum";

describe("RoutePathEnum", () => {
  it("keeps the public url segments", () => {
    expect(Object.values(RoutePathEnum)).toEqual(["/", "/carte", "/journal", "/profil"]);
  });
});
