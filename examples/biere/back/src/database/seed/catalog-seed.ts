import { normalizeSearchText } from "@/common/text/normalize-search-text";
import { BEER_AROMA_BY_SEED_SLUG, type BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BEER_FAMILY_BY_SEED_LABEL } from "@/modules/beers/enums/beer-family.enum";
import { BeerFormatEnum, isBeerFormat } from "@/modules/beers/enums/beer-format.enum";
import type { Beer } from "@/modules/beers/entities/beer.entity";
import type { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import type { Brewery } from "@/modules/beers/entities/brewery.entity";

export interface StyleSeedRow {
  readonly family: string;
  readonly name: string;
  readonly description: string;
  readonly ebcMin: number;
  readonly ebcMax: number;
  readonly abvMin: number;
  readonly abvMax: number;
  readonly ibuMin: number;
  readonly ibuMax: number;
}

export interface BrewerySeedRow {
  readonly name: string;
  readonly country: string;
  readonly city: string;
}

export interface BeerSeedRow {
  readonly name: string;
  readonly breweryName: string;
  readonly styleName: string;
  readonly abv: number;
  readonly ibu: number | null;
  readonly ebc: number | null;
  readonly description: string;
  readonly aromas: readonly string[];
  readonly formats: readonly string[];
  readonly country: string;
  readonly imageUrl?: string | null;
}

export type BeerInsertRow = Omit<Beer, "id" | "brewery" | "style" | "createdBy" | "createdAt">;

const toStyleRow = ({ family, ...fields }: StyleSeedRow): Omit<BeerStyle, "id"> => {
  if (!Object.hasOwn(BEER_FAMILY_BY_SEED_LABEL, family)) {
    throw new Error(`Style "${fields.name}" has an unknown family "${family}".`);
  }
  return { ...fields, family: BEER_FAMILY_BY_SEED_LABEL[family] };
};

export const buildStyleRows = (rows: readonly StyleSeedRow[]): Omit<BeerStyle, "id">[] => rows.map(toStyleRow);

export const buildBreweryRows = (rows: readonly BrewerySeedRow[]): Omit<Brewery, "id">[] =>
  rows.map(({ name, country, city }) => ({ name, country, city }));

const findId = (ids: ReadonlyMap<string, number>, name: string, beerName: string, kind: string): number => {
  const id = ids.get(name.toLowerCase());
  if (id === undefined) {
    throw new Error(`Beer "${beerName}" has an unknown ${kind} "${name}".`);
  }
  return id;
};

const toAromas = (row: BeerSeedRow): BeerAromaEnum[] =>
  row.aromas.map((slug) => {
    if (!Object.hasOwn(BEER_AROMA_BY_SEED_SLUG, slug)) {
      throw new Error(`Beer "${row.name}" has an unknown aroma "${slug}".`);
    }
    return BEER_AROMA_BY_SEED_SLUG[slug];
  });

const toFormats = (row: BeerSeedRow): BeerFormatEnum[] => {
  const unknown = row.formats.find((format) => !isBeerFormat(format));
  if (unknown !== undefined) {
    throw new Error(`Beer "${row.name}" has an unknown format "${unknown}".`);
  }
  return Object.values(BeerFormatEnum).filter((format) => row.formats.includes(format));
};

export const buildBeerRows = (
  rows: readonly BeerSeedRow[],
  styleIdsByName: ReadonlyMap<string, number>,
  breweryIdsByName: ReadonlyMap<string, number>,
): BeerInsertRow[] =>
  rows.map((row) => ({
    name: row.name,
    breweryId: findId(breweryIdsByName, row.breweryName, row.name, "brewery"),
    styleId: findId(styleIdsByName, row.styleName, row.name, "style"),
    abv: row.abv,
    ibu: row.ibu,
    ebc: row.ebc,
    sweetness: null,
    acidity: null,
    body: null,
    description: row.description,
    aromas: toAromas(row),
    formats: toFormats(row),
    country: row.country,
    searchText: normalizeSearchText(`${row.name} ${row.breweryName}`),
  }));
