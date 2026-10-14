import type { BreweryDto } from "@/types/dtos/brewery/breweryDto";
import type { Brewery } from "@/types/models/brewery/brewery";

export const breweryDtoToModel = ({ id, name, country }: BreweryDto): Brewery => ({ id, name, country });
