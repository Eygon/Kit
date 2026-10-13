import { isBeerAroma } from "@/types/enums/beer/beerAromaEnum";
import { isBeerFamily } from "@/types/enums/beer/beerFamilyEnum";
import { isBeerFormat } from "@/types/enums/beer/beerFormatEnum";
import type { BeerDto } from "@/types/dtos/beer/beerDto";
import type { Beer } from "@/types/models/beer/beer";

export const beerDtoToModel = (dto: BeerDto): Beer => ({
  id: dto.id,
  name: dto.name,
  breweryName: dto.breweryName,
  country: dto.country,
  styleId: dto.styleId,
  styleName: dto.styleName,
  family: isBeerFamily(dto.family) ? dto.family : null,
  abv: dto.abv,
  aromas: dto.aromas.filter(isBeerAroma),
  formats: dto.formats.filter(isBeerFormat),
  description: dto.description,
  drunk: dto.drunk ?? false,
  checkinCount: dto.checkinCount ?? 0,
  inWishlist: dto.inWishlist ?? false,
});
