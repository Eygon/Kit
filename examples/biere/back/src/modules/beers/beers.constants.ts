export const BEER_STYLE_NAME_MAX_LENGTH = 60;

export const BEER_STYLE_DESCRIPTION_MAX_LENGTH = 200;

export const BREWERY_NAME_MAX_LENGTH = 60;

export const BREWERY_CITY_MAX_LENGTH = 60;

export const COUNTRY_CODE_LENGTH = 2;

export const BEER_NAME_MIN_LENGTH = 2;

export const BEER_NAME_MAX_LENGTH = 80;

export const BREWERY_NAME_MIN_LENGTH = 2;

export const BEER_DESCRIPTION_MAX_LENGTH = 500;

export const BEER_SEARCH_TEXT_MAX_LENGTH = BEER_NAME_MAX_LENGTH + 1 + BREWERY_NAME_MAX_LENGTH;

export const BEER_SEARCH_MAX_LENGTH = 100;

export const BEER_PAGE_SIZE_DEFAULT = 20;

export const BEER_PAGE_SIZE_MAX = 50;

export const BEER_ABV_MAX_PERCENT = 14;

export const BEER_PROPOSAL_ABV_MAX_PERCENT = 20;

export const BEER_ABV_MAX_DECIMAL_PLACES = 1;

export const BEER_PROPOSALS_PER_WINDOW_MAX = 10;

export const BEER_PROPOSAL_WINDOW_HOURS = 24;

const MILLISECONDS_PER_HOUR = 3_600_000;

export const BEER_PROPOSAL_WINDOW_MS = BEER_PROPOSAL_WINDOW_HOURS * MILLISECONDS_PER_HOUR;

const HOURS_PER_DAY = 24;

const MILLISECONDS_PER_DAY = HOURS_PER_DAY * MILLISECONDS_PER_HOUR;

export const CORRECTION_VOTE_DURATION_DAYS = 7;

export const CORRECTION_VOTE_DURATION_MS = CORRECTION_VOTE_DURATION_DAYS * MILLISECONDS_PER_DAY;

export const CORRECTION_REASON_MAX_LENGTH = 200;

export const CORRECTION_VALUE_MAX_LENGTH = 200;

export const CORRECTIONS_PER_WINDOW_MAX = 10;

export const CORRECTION_WINDOW_HOURS = HOURS_PER_DAY;

export const CORRECTION_WINDOW_MS = CORRECTION_WINDOW_HOURS * MILLISECONDS_PER_HOUR;

export const CORRECTION_QUORUM = 2;

export const CORRECTIONS_RECENTLY_CLOSED_LIMIT = 10;

export const BEER_LIST_MIN_ITEMS = 1;

export const BITTERNESS_LEVEL_IBU_MAX: readonly number[] = [15, 25, 40, 60];

export const COLOR_LEVEL_EBC_MAX: readonly number[] = [8, 16, 33, 60];

export const BEER_IBU_MIN = 0;

export const BEER_IBU_MAX = 120;

export const BEER_EBC_MIN = 2;

export const BEER_EBC_MAX = 80;

export const BEER_SCALE_MIN = 1;

export const BEER_SCALE_MAX = 5;

export const BEER_AROMAS_MAX = 5;

export const BEER_FORMATS_MAX = 3;

export const REVIEW_RATING_MIN = 1;

export const REVIEW_RATING_MAX = 5;

export const REVIEW_RATING_STEP = 0.5;

export const REVIEW_RATING_BUCKET_ROUNDING_OFFSET = 0.5;

export const REVIEW_TEXT_MAX_LENGTH = 500;

export const REVIEW_PAGE_SIZE = 10;

export const COUNTRY_CODES: readonly string[] = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT",
  "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI",
  "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY",
  "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
  "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM",
  "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK",
  "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL",
  "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
  "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR",
  "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN",
  "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS",
  "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW",
  "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP",
  "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM",
  "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM",
  "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF",
  "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW",
  "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
  "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
];
