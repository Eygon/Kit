import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { MapBanner } from "@/pages/map/components/elements/mapBanner/mapBanner";

describe("MapBanner", () => {
  it("announces an error as an alert", () => {
    renderWithProviders(<MapBanner message={{ key: "pages.map.locate.unavailable", isError: true }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Position indisponible.");
  });

  it("shows an information message without any alert role and keeps its actions", () => {
    renderWithProviders(
      <MapBanner message={{ key: "pages.map.tilesUnavailable", isError: false }}>
        <button type="button">Annuler</button>
      </MapBanner>,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Fond de carte indisponible : les lieux restent utilisables.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
  });
});
