import { QueryClient } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { Mock } from "vitest";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import VenueService from "@/api/venues/venueService";
import { VenuePlaceField } from "@/components/modules/checkinSheet/components/venuePlaceField/venuePlaceField";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import { EMPTY_VENUE_QUERY } from "@/types/mappers/venue/venueQueryMapper";
import type { Venue } from "@/types/models/venue/venue";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

vi.mock("@/api/venues/venueService", () => ({
  default: { search: vi.fn() },
}));

const found = (venues: Venue[], isApproximate = false) => ({ venues, isApproximate });

const LONG_NAME = "Brasserie-Artisanale-Du-Mont-Blanc-Et-Des-Alpes-Sans-Aucun-Espace-Dans-Son-Nom-Tres-Tres-Long-Vraiment";

const buildVenue = (overrides: Partial<Venue> = {}): Venue => ({
  id: 5,
  name: "La Taverne de Cluny",
  type: VenueTypeEnum.BAR,
  city: "Paris",
  address: "1 rue de Cluny",
  latitude: 48.85,
  longitude: 2.35,
  description: "",
  distanceKm: null,
  checkinCount: 0,
  lastCheckinAt: null,
  status: AvailabilityStatusEnum.CONFIRMED,
  ...overrides,
});

const CLUNY = buildVenue();
const NORD = buildVenue({ id: 6, name: "Taverne du Nord", city: "Lille" });

const search = VenueService.search as Mock;
const onChange = vi.fn();

const renderField = (
  {
    errorMessage = null,
    queryClient,
    initial = { place: "", venueId: null },
  }: {
    errorMessage?: string | null;
    queryClient?: QueryClient;
    initial?: { place: string; venueId: number | null };
  } = {},
) => {
  const Harness = () => {
    const [state, setState] = useState<{ place: string; venueId: number | null }>(initial);
    return (
      <>
        <VenuePlaceField
          place={state.place}
          venueId={state.venueId}
          errorMessage={errorMessage}
          onChange={(place: string, venueId: number | null) => {
            onChange(place, venueId);
            setState({ place, venueId });
          }}
        />
        <output data-testid="linked-venue">{String(state.venueId)}</output>
        <button type="button" onClick={() => setState((previous) => ({ ...previous, place: "Autre" }))}>
          replace-place
        </button>
      </>
    );
  };
  return renderWithProviders(<Harness />, queryClient === undefined ? {} : { queryClient });
};

const input = () => screen.getByRole("combobox", { name: /^Lieu/ });
const linkedVenue = () => screen.getByTestId("linked-venue");
const optionNames = () => screen.getAllByRole("option").map((option) => option.textContent);

const typeInField = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.click(input());
  await user.type(input(), text);
  await waitFor(() => expect(search).toHaveBeenLastCalledWith({ ...EMPTY_VENUE_QUERY, q: text.trim() }), { timeout: 4000 });
};

describe("VenuePlaceField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search.mockResolvedValue(found([CLUNY, NORD]));
  });

  describe("the field", () => {
    it("is a required, labelled place field capped at 80 characters", async () => {
      renderField();

      expect(input()).toBeRequired();
      expect(input()).toHaveAttribute("maxlength", "80");
      expect(input()).toHaveValue("");
    });

    it("shows the message it is given and none when it has none", async () => {
      const { unmount } = renderField({ errorMessage: "Indiquez le lieu." });
      expect(await screen.findByText("Indiquez le lieu.")).toBeInTheDocument();
      unmount();

      renderField();
      expect(screen.queryByText("Indiquez le lieu.")).not.toBeInTheDocument();
    });
  });

  describe("suggestions", () => {
    it("proposes La Taverne de Cluny with its city once taverne is typed, and asks the service for taverne", async () => {
      const user = userEvent.setup();
      renderField();

      await typeInField(user, "taverne");

      expect(await screen.findByRole("option", { name: /La Taverne de Cluny/ }, { timeout: 4000 })).toHaveTextContent("Paris");
      expect(search).toHaveBeenLastCalledWith({ ...EMPTY_VENUE_QUERY, q: "taverne" });
    });

    it("keeps the order of the back, whichever it is", async () => {
      const user = userEvent.setup();
      search.mockResolvedValue(found([CLUNY, NORD]));
      const first = renderField();
      await typeInField(user, "taverne");
      await screen.findByRole("option", { name: /Taverne de Cluny/ });
      expect(optionNames()).toEqual(["La Taverne de ClunyParis", "Taverne du NordLille"]);
      first.unmount();

      search.mockResolvedValue(found([NORD, CLUNY]));
      renderField({ queryClient: new QueryClient() });
      await typeInField(user, "taverne");
      await screen.findByRole("option", { name: /Taverne du Nord/ });
      expect(optionNames()).toEqual(["Taverne du NordLille", "La Taverne de ClunyParis"]);
    });

    it("proposes the close places the back returns for a misspelled name, with no close-match mention, and links the chosen one", async () => {
      const user = userEvent.setup();
      search.mockResolvedValue(found([CLUNY], true));
      renderField();

      await typeInField(user, "taverne cluni");

      const option = await screen.findByRole("option", { name: /La Taverne de Cluny/ });
      expect(screen.getAllByRole("option")).toHaveLength(1);
      expect(screen.queryByText("Aucun résultat exact : voici des lieux proches")).not.toBeInTheDocument();
      await user.click(option);
      await waitFor(() => expect(linkedVenue()).toHaveTextContent("5"));
      expect(input()).toHaveValue("La Taverne de Cluny");
    });

    it("forwards what is typed as it is, so the back can fold accents and case", async () => {
      const user = userEvent.setup();
      const academie = buildVenue({ id: 8, name: "Académie de la Bière", city: "Paris" });
      search.mockResolvedValue(found([academie]));
      renderField();

      await typeInField(user, "academie");

      expect(await screen.findByRole("option", { name: /Académie de la Bière/ })).toBeInTheDocument();
      expect(search).toHaveBeenLastCalledWith({ ...EMPTY_VENUE_QUERY, q: "academie" });
    });

    it("proposes the places of a city typed as such", async () => {
      const user = userEvent.setup();
      const lyon = [buildVenue({ id: 9, name: "Le Bouchon", city: "Lyon" }), buildVenue({ id: 10, name: "La Cave", city: "Lyon" })];
      search.mockResolvedValue(found(lyon));
      renderField();

      await typeInField(user, "Lyon");

      await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
      expect(search).toHaveBeenLastCalledWith({ ...EMPTY_VENUE_QUERY, q: "Lyon" });
    });

    it("proposes a place that has just been added to the map as soon as the lists are invalidated", async () => {
      const user = userEvent.setup();
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      search.mockResolvedValue(found([]));
      renderField({ queryClient });
      await typeInField(user, "cluny");
      expect(await screen.findByText("Aucun lieu de la carte : votre texte sera gardé tel quel")).toBeInTheDocument();

      search.mockResolvedValue(found([CLUNY]));
      await queryClient.invalidateQueries({ queryKey: venueKeys.lists() });

      expect(await screen.findByRole("option", { name: /La Taverne de Cluny/ })).toBeInTheDocument();
    });

    it("makes each suggestion at least 44px high and lets long names wrap", async () => {
      const user = userEvent.setup();
      search.mockResolvedValue(found([buildVenue({ name: LONG_NAME, city: "Chamonix-Mont-Blanc-Et-Ses-Environs-Sans-Espace" })]));
      renderField();

      await typeInField(user, "brasserie");

      const option = await screen.findByRole("option", { name: new RegExp(LONG_NAME) });
      expect(option).toHaveClass("min-h-11");
      expect(screen.getByText(LONG_NAME)).toHaveClass("break-words");
      expect(screen.getByText("Chamonix-Mont-Blanc-Et-Ses-Environs-Sans-Espace")).toHaveClass("break-words", "text-sm", "text-muted");
    });
  });

  describe("edge cases", () => {
    it("keeps a venue name of 80 characters whole and linked", async () => {
      const user = userEvent.setup();
      const longName = "B".repeat(80);
      search.mockResolvedValue(found([buildVenue({ id: 21, name: longName })]));
      renderField();
      await typeInField(user, "BBB");

      await user.click(await screen.findByRole("option", { name: new RegExp(longName) }));

      await waitFor(() => expect(input()).toHaveValue(longName));
      expect(onChange).toHaveBeenLastCalledWith(longName, 21);
    });

    it("tells two places of the same name apart by their city, each with its own id", async () => {
      const user = userEvent.setup();
      search.mockResolvedValue(found([buildVenue({ id: 31, name: "Le Comptoir", city: "Paris" }), buildVenue({ id: 32, name: "Le Comptoir", city: "Lyon" })]));
      renderField();
      await typeInField(user, "comptoir");
      await screen.findByRole("option", { name: /Lyon/ });
      expect(optionNames()).toEqual(["Le ComptoirParis", "Le ComptoirLyon"]);

      await user.click(screen.getByRole("option", { name: /Lyon/ }));

      await waitFor(() => expect(linkedVenue()).toHaveTextContent("32"));
    });

    it("drops the link when the chosen text is erased entirely", async () => {
      const user = userEvent.setup();
      renderField();
      await typeInField(user, "taverne");
      await user.click(await screen.findByRole("option", { name: /La Taverne de Cluny/ }));
      await waitFor(() => expect(linkedVenue()).toHaveTextContent("5"));

      await user.clear(input());

      expect(input()).toHaveValue("");
      expect(onChange).toHaveBeenLastCalledWith("", null);
      expect(linkedVenue()).toHaveTextContent("null");
    });
  });

  describe("the link with a venue", () => {
    it("reports the venue name and id when a suggestion is chosen, and keeps the link once the input shows the name", async () => {
      const user = userEvent.setup();
      renderField();
      await typeInField(user, "taverne");

      await user.click(await screen.findByRole("option", { name: /La Taverne de Cluny/ }));

      expect(onChange).toHaveBeenCalledWith("La Taverne de Cluny", 5);
      await waitFor(() => expect(input()).toHaveValue("La Taverne de Cluny"));
      expect(linkedVenue()).toHaveTextContent("5");
      expect(onChange).toHaveBeenLastCalledWith("La Taverne de Cluny", 5);
    });

    it("links the other suggestion to its own id", async () => {
      const user = userEvent.setup();
      renderField();
      await typeInField(user, "taverne");

      await user.click(await screen.findByRole("option", { name: /Taverne du Nord/ }));

      await waitFor(() => expect(linkedVenue()).toHaveTextContent("6"));
      expect(input()).toHaveValue("Taverne du Nord");
    });

    it("reports a free text with no venue", async () => {
      const user = userEvent.setup();
      renderField();

      await typeInField(user, "Chez moi");

      expect(input()).toHaveValue("Chez moi");
      expect(onChange).toHaveBeenLastCalledWith("Chez moi", null);
      expect(onChange.mock.calls.map((call) => call[1])).toEqual(Array(8).fill(null));
      expect(linkedVenue()).toHaveTextContent("null");
    });

    it("drops the link as soon as the text is edited after a choice", async () => {
      const user = userEvent.setup();
      renderField();
      await typeInField(user, "taverne");
      await user.click(await screen.findByRole("option", { name: /La Taverne de Cluny/ }));
      await waitFor(() => expect(linkedVenue()).toHaveTextContent("5"));

      await user.type(input(), " (terrasse)");

      expect(input()).toHaveValue("La Taverne de Cluny (terrasse)");
      expect(onChange).toHaveBeenLastCalledWith("La Taverne de Cluny (terrasse)", null);
      expect(linkedVenue()).toHaveTextContent("null");
    });

    it("drops the link when the end of the chosen name is deleted, and does not give it back when retyped", async () => {
      const user = userEvent.setup();
      renderField();
      await typeInField(user, "taverne");
      await user.click(await screen.findByRole("option", { name: /La Taverne de Cluny/ }));
      await waitFor(() => expect(linkedVenue()).toHaveTextContent("5"));

      await user.type(input(), "{Backspace}");
      expect(linkedVenue()).toHaveTextContent("null");
      await user.type(input(), "y");

      expect(input()).toHaveValue("La Taverne de Cluny");
      expect(linkedVenue()).toHaveTextContent("null");
    });

    it("keeps the typed text and no venue when the choice is dismissed", async () => {
      const user = userEvent.setup();
      renderField();
      await typeInField(user, "taverne");
      await screen.findByRole("option", { name: /La Taverne de Cluny/ });

      await user.keyboard("{Escape}");

      expect(input()).toHaveValue("taverne");
      expect(onChange).toHaveBeenLastCalledWith("taverne", null);
    });
  });

  describe("the list when there is nothing to choose", () => {
    it("says the text will be kept as it is when no place matches, and keeps it as a free text", async () => {
      const user = userEvent.setup();
      search.mockResolvedValue(found([]));
      renderField();

      await typeInField(user, "Chez moi");

      expect(await screen.findByText("Aucun lieu de la carte : votre texte sera gardé tel quel")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
        "Aucun lieu de la carte : votre texte sera gardé tel quel",
      ]);
      expect(onChange).toHaveBeenLastCalledWith("Chez moi", null);
    });

    it("says the suggestions are unavailable when the search fails, and keeps the free text", async () => {
      const user = userEvent.setup();
      search.mockRejectedValue(new Error("boom"));
      renderField();

      await typeInField(user, "Chez moi");

      expect(await screen.findByText("Suggestions indisponibles")).toBeInTheDocument();
      expect(screen.queryByText("Aucun lieu de la carte : votre texte sera gardé tel quel")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(onChange).toHaveBeenLastCalledWith("Chez moi", null);
    });

    it("says the places are being searched while the search runs", async () => {
      const user = userEvent.setup();
      search.mockImplementation(() => new Promise(() => undefined));
      renderField();

      await typeInField(user, "Chez moi");

      expect(await screen.findByText("Recherche des lieux…")).toBeInTheDocument();
      expect(screen.queryByText("Suggestions indisponibles")).not.toBeInTheDocument();
      expect(screen.queryByText("Aucun lieu de la carte : votre texte sera gardé tel quel")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows none of the three messages while the field is empty", async () => {
      renderField();

      expect(screen.queryByText("Recherche des lieux…")).not.toBeInTheDocument();
      expect(screen.queryByText("Suggestions indisponibles")).not.toBeInTheDocument();
      expect(screen.queryByText("Aucun lieu de la carte : votre texte sera gardé tel quel")).not.toBeInTheDocument();
      expect(search).not.toHaveBeenCalled();
    });
  });

  describe("when it opens on an already linked place", () => {
    const LINKED = { place: "La Taverne de Cluny", venueId: 5 };

    it("shows the place and keeps the venue linked while the text is untouched", async () => {
      const user = userEvent.setup();
      renderField({ initial: LINKED });

      expect(input()).toHaveValue("La Taverne de Cluny");
      await user.click(input());
      await user.keyboard("{Enter}");
      await user.tab();

      expect(linkedVenue()).toHaveTextContent("5");
    });

    it("drops the link as soon as the text is edited", async () => {
      const user = userEvent.setup();
      renderField({ initial: LINKED });

      await user.click(input());
      await user.keyboard(" terrasse");

      expect(onChange).toHaveBeenLastCalledWith("La Taverne de Cluny terrasse", null);
      expect(linkedVenue()).toHaveTextContent("null");
    });

    it("reports the seeded venue when its own name is typed back over a text replaced from outside", async () => {
      const user = userEvent.setup();
      renderField({ initial: LINKED });
      await user.click(screen.getByRole("button", { name: "replace-place" }));
      expect(input()).toHaveValue("Autre");

      await user.click(input());
      await user.keyboard("{Control>}a{/Control}");
      await user.paste("La Taverne de Cluny");

      expect(onChange).toHaveBeenLastCalledWith("La Taverne de Cluny", 5);
      expect(linkedVenue()).toHaveTextContent("5");
    });

    it("never links a venue to a name it was not seeded with", async () => {
      const user = userEvent.setup();
      renderField({ initial: { place: "Chez Paul", venueId: null } });
      await user.click(screen.getByRole("button", { name: "replace-place" }));

      await user.click(input());
      await user.keyboard("{Control>}a{/Control}");
      await user.paste("Chez Paul");

      expect(onChange).toHaveBeenLastCalledWith("Chez Paul", null);
    });

    it("stays a free text with no venue when it opens without a link", async () => {
      const user = userEvent.setup();
      renderField({ initial: { place: "Chez Paul", venueId: null } });

      await user.click(input());
      await user.keyboard("!");

      expect(onChange).toHaveBeenLastCalledWith("Chez Paul!", null);
      expect(linkedVenue()).toHaveTextContent("null");
    });
  });
});
