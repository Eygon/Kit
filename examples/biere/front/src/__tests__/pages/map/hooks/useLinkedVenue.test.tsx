export {};

import type { QueryClient } from "@tanstack/react-query";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Route, Routes, useLocation, useNavigationType } from "react-router";
import type { Mock } from "vitest";
import { createTestQueryClient, renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import VenueService from "@/api/venues/venueService";
import { useLinkedVenue } from "@/pages/map/hooks/useLinkedVenue";
import { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";
import type { Venue } from "@/types/models/venue/venue";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

vi.mock("@/api/venues/venueService", () => ({
  default: { getById: vi.fn() },
}));

const VENUE: Venue = {
  id: 12,
  name: "Delirium Café",
  type: null,
  city: "Bruxelles",
  address: "Impasse de la Fidélité 4",
  latitude: 50.85,
  longitude: 4.35,
  description: "",
  distanceKm: null,
  checkinCount: 2,
  lastCheckinAt: null,
  status: AvailabilityStatusEnum.CONFIRMED,
};

type LinkedVenueApi = {
  linkedVenue: Venue | null;
  clearLinkedVenue: () => void;
};

const renderLinked = (initialPath: string, queryClient: QueryClient = createTestQueryClient()) => {
  const holder: { api: LinkedVenueApi | null } = { api: null };

  const Probe = () => {
    const api: LinkedVenueApi = useLinkedVenue();
    holder.api = api;
    const [, setRenderCount] = useState(0);
    return (
      <>
        <button type="button" onClick={() => setRenderCount((count) => count + 1)}>
          render again
        </button>
        <output aria-label="search">{useLocation().search}</output>
        <output aria-label="navigation">{useNavigationType()}</output>
      </>
    );
  };

  renderWithProviders(
    <Routes>
      <Route path="*" element={<Probe />} />
    </Routes>,
    { initialPath, queryClient },
  );

  return () => {
    if (holder.api === null) throw new Error("hook not rendered");
    return holder.api;
  };
};

const urlSearch = () => screen.getByLabelText("search").textContent;
const navigationType = () => screen.getByLabelText("navigation").textContent;

describe("useLinkedVenue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (VenueService.getById as Mock).mockResolvedValue(VENUE);
  });

  it("reads the venue named by the venue parameter once and exposes it", async () => {
    const client = createTestQueryClient();
    const api = renderLinked("/carte?venue=12", client);

    expect(api().linkedVenue).toBeNull();
    await waitFor(() => expect(api().linkedVenue).toEqual(VENUE));
    expect(VenueService.getById).toHaveBeenCalledTimes(1);
    expect(VenueService.getById).toHaveBeenCalledWith(12);
    expect(client.getQueryData(venueKeys.detail(12))).toEqual(VENUE);
  });

  it("AC1 keeps the very same venue object across renders, so the map centres once", async () => {
    const user = userEvent.setup();
    const api = renderLinked("/carte?venue=12");
    await waitFor(() => expect(api().linkedVenue).toEqual(VENUE));
    const first = api().linkedVenue;

    await user.click(screen.getByRole("button", { name: "render again" }));
    await user.click(screen.getByRole("button", { name: "render again" }));

    expect(api().linkedVenue).toBe(first);
    expect(VenueService.getById).toHaveBeenCalledTimes(1);
  });

  it.each(["abc", "0", "-1", "1.5", "12abc", ""])("AC3 makes no read for the reference %j and leaves the address alone", async (value) => {
    const api = renderLinked(`/carte?type=bar&venue=${value}`);

    await act(async () => {
      await Promise.resolve();
    });

    expect(VenueService.getById).not.toHaveBeenCalled();
    expect(api().linkedVenue).toBeNull();
    expect(urlSearch()).toBe(`?type=bar&venue=${value}`);
  });

  it("AC5 makes no read without a venue parameter", async () => {
    const api = renderLinked("/carte?type=bar");

    await act(async () => {
      await Promise.resolve();
    });

    expect(VenueService.getById).not.toHaveBeenCalled();
    expect(api().linkedVenue).toBeNull();
    expect(urlSearch()).toBe("?type=bar");
  });

  it("AC2 removes only the venue parameter and replaces the history entry", async () => {
    const api = renderLinked("/carte?type=bar&venue=12&undrunk=1&visited=1");
    await waitFor(() => expect(api().linkedVenue).toEqual(VENUE));

    act(() => api().clearLinkedVenue());

    expect(urlSearch()).toBe("?type=bar&undrunk=1&visited=1");
    expect(navigationType()).toBe("REPLACE");
    expect(api().linkedVenue).toBeNull();
  });

  it("AC4 removes the reference of an unknown venue once, keeps the other parameters and opens nothing", async () => {
    (VenueService.getById as Mock).mockResolvedValue(null);
    const api = renderLinked("/carte?type=bar&venue=99&undrunk=1");

    await waitFor(() => expect(urlSearch()).toBe("?type=bar&undrunk=1"));

    expect(VenueService.getById).toHaveBeenCalledTimes(1);
    expect(VenueService.getById).toHaveBeenCalledWith(99);
    expect(api().linkedVenue).toBeNull();
    expect(navigationType()).toBe("REPLACE");
  });
});
