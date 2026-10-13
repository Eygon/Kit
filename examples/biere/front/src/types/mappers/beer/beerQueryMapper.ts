import { isBeerFamily } from "@/types/enums/beer/beerFamilyEnum";
import { isBeerFormat } from "@/types/enums/beer/beerFormatEnum";
import type { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
import { DEFAULT_BEER_SORT, isBeerSort } from "@/types/enums/beer/beerSortEnum";
import { isBeerStatus } from "@/types/enums/beer/beerStatusEnum";
import type { BeerQuery } from "@/types/models/beer/beerQuery";

export const EMPTY_BEER_QUERY: BeerQuery = {
  search: "",
  family: null,
  styleIds: [],
  countries: [],
  formats: [],
  abvMin: null,
  abvMax: null,
  status: null,
  sort: DEFAULT_BEER_SORT,
};

export const beerQueryToSearchParams = (query: BeerQuery, page?: number, size?: number): URLSearchParams => {
  const params = new URLSearchParams();
  const search = query.search.trim();
  if (search !== "") params.append("q", search);
  if (query.family !== null) params.append("family", query.family);
  query.styleIds.forEach((styleId) => params.append("style", styleId.toString()));
  query.countries.forEach((country) => params.append("country", country));
  query.formats.forEach((format) => params.append("format", format));
  if (query.abvMin !== null) params.append("abvMin", query.abvMin.toString());
  if (query.abvMax !== null) params.append("abvMax", query.abvMax.toString());
  if (query.status !== null) params.append("status", query.status);
  if (query.sort !== DEFAULT_BEER_SORT) params.append("sort", query.sort);
  if (page !== undefined) params.append("page", page.toString());
  if (size !== undefined) params.append("size", size.toString());
  return params;
};

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const DEGREE_PATTERN = /^\d+(\.\d+)?$/;
const MAX_ABV = 14;

const parseStyleId = (value: string): number[] => (POSITIVE_INTEGER_PATTERN.test(value) ? [Number(value)] : []);

const parseDegree = (value: string | null): number | null => {
  if (value === null || !DEGREE_PATTERN.test(value)) return null;
  const degree = Number(value);
  return degree <= MAX_ABV ? degree : null;
};

const parseFormats = (values: string[]): BeerFormatEnum[] => values.filter(isBeerFormat);

export const searchParamsToBeerQuery = (params: URLSearchParams): BeerQuery => {
  const family = params.get("family");
  const sort = params.get("sort");
  const status = params.get("status");
  const abvMin = parseDegree(params.get("abvMin"));
  const abvMax = parseDegree(params.get("abvMax"));
  const hasInvertedRange = abvMin !== null && abvMax !== null && abvMin > abvMax;

  return {
    search: params.get("q") ?? "",
    family: isBeerFamily(family) ? family : null,
    styleIds: params.getAll("style").flatMap(parseStyleId),
    countries: params.getAll("country").filter((country) => COUNTRY_CODE_PATTERN.test(country)),
    formats: parseFormats(params.getAll("format")),
    abvMin: hasInvertedRange ? null : abvMin,
    abvMax: hasInvertedRange ? null : abvMax,
    status: isBeerStatus(status) ? status : null,
    sort: isBeerSort(sort) ? sort : DEFAULT_BEER_SORT,
  };
};

export const isEmptyBeerQuery = (query: BeerQuery): boolean =>
  query.search.trim() === "" &&
  query.family === null &&
  query.styleIds.length === 0 &&
  query.countries.length === 0 &&
  query.formats.length === 0 &&
  query.abvMin === null &&
  query.abvMax === null &&
  query.status === null;
