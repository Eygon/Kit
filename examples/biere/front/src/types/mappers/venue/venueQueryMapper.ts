import type { VenueQuery } from "@/types/models/venue/venueQuery";

export const EMPTY_VENUE_QUERY: VenueQuery = {
  bounds: null,
  types: [],
  family: null,
  beerId: null,
  confirmedOnly: false,
  undiscovered: false,
  position: null,
  radiusKm: null,
  q: "",
};

export const venueQueryToSearchParams = (query: VenueQuery): URLSearchParams => {
  const params = new URLSearchParams();
  if (query.bounds !== null) {
    params.append("north", query.bounds.north.toString());
    params.append("south", query.bounds.south.toString());
    params.append("east", query.bounds.east.toString());
    params.append("west", query.bounds.west.toString());
  }
  query.types.forEach((type) => params.append("type", type));
  if (query.beerId !== null) params.append("beer", query.beerId.toString());
  if (query.family !== null) params.append("family", query.family);
  if (query.confirmedOnly) params.append("confirmedOnly", "true");
  if (query.undiscovered) params.append("undiscovered", "true");
  if (query.position !== null) {
    params.append("latitude", query.position.latitude.toString());
    params.append("longitude", query.position.longitude.toString());
  }
  if (query.radiusKm !== null) params.append("radiusKm", query.radiusKm.toString());
  const text = query.q.trim();
  if (text !== "") params.append("q", text);
  return params;
};
