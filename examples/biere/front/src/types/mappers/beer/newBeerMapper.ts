import type { CreateBeerDto } from "@/types/dtos/beer/createBeerDto";
import type { NewBeer } from "@/types/models/beer/newBeer";

export const newBeerToDto = (newBeer: NewBeer): CreateBeerDto => ({
  name: newBeer.name,
  breweryName: newBeer.breweryName,
  country: newBeer.country,
  styleId: newBeer.styleId,
  abv: newBeer.abv,
  description: newBeer.description,
});
