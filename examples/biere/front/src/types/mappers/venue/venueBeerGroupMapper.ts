import type { VenueBeer } from "@/types/models/venue/venueBeer";
import type { VenueBeerGroup } from "@/types/models/venue/venueBeerGroup";

export const venueBeersToFamilyGroups = (beers: VenueBeer[]): VenueBeerGroup[] =>
  beers.reduce<VenueBeerGroup[]>((groups, beer) => {
    const lastGroup = groups.at(-1);
    if (lastGroup !== undefined && lastGroup.family === beer.family) lastGroup.beers.push(beer);
    else groups.push({ family: beer.family, beers: [beer] });
    return groups;
  }, []);
