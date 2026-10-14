import { isBeerAroma } from "@/types/enums/beer/beerAromaEnum";
import { isBeerFamily } from "@/types/enums/beer/beerFamilyEnum";
import { isBeerFormat } from "@/types/enums/beer/beerFormatEnum";
import { BeerSourceEnum, isBeerSource } from "@/types/enums/beer/beerSourceEnum";
import { criterionAverageDtoToModel } from "@/types/mappers/beer/criterionAverageMapper";
import { levelRangeDtoToModel } from "@/types/mappers/beer/levelRangeMapper";
import { ratingBucketDtoToModel } from "@/types/mappers/beer/ratingBucketMapper";
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
  bitternessLevel: dto.bitternessLevel ?? null,
  colorLevel: dto.colorLevel ?? null,
  styleColorRange: dto.styleColorRange ? levelRangeDtoToModel(dto.styleColorRange) : null,
  averageRating: dto.averageRating ?? null,
  reviewCount: dto.reviewCount ?? 0,
  ratingDistribution: (dto.ratingDistribution ?? []).map(ratingBucketDtoToModel),
  criteria: (dto.criteria ?? []).flatMap((criterion) => criterionAverageDtoToModel(criterion) ?? []),
  source: isBeerSource(dto.source) ? dto.source : BeerSourceEnum.OFFICIAL,
  createdByName: dto.createdByName ?? null,
});
