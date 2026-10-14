import type { BreweryDto } from "@/modules/beers/dtos/brewery.dto";
import type { Brewery } from "@/modules/beers/entities/brewery.entity";

export const toBreweryDto = (entity: Brewery): BreweryDto => ({
  id: entity.id,
  name: entity.name,
  country: entity.country,
});

export const toNewBrewery = (name: string, country: string): Omit<Brewery, "id"> => ({ name, country, city: "" });
