/*
 * Mousse — faux serveur d'API exécuté dans le navigateur.
 * Remplace window.fetch pour toute URL commençant par https://mousse.mock/api/v1 et répond comme le back NestJS
 * (branche dev) : mêmes statuts, mêmes corps JSON, mêmes erreurs { message }, mêmes règles de validation et de tri.
 * Les autres URL passent au vrai fetch. Données : window.__MOUSSE_SEED__ (seed-data.js). État en mémoire, persisté
 * dans localStorage (clé mousse-mock-state-v1). window.__mockReset() repart du seed.
 */
(function () {
  "use strict";

  var root = typeof window !== "undefined" ? window : globalThis;
  var BASE_ORIGIN = "https://mousse.mock";
  var API_PREFIX = "/api/v1";
  var BASE_URL = BASE_ORIGIN + API_PREFIX;
  var STORAGE_KEY = "mousse-mock-state-v1";
  var STATE_VERSION = 2; // 2 : F11-F13 (venueId, bières communautaires) ; un état d'une autre version est ignoré
  var options = root.__MOUSSE_MOCK_OPTIONS__ || {};
  var LATENCY = Array.isArray(options.latency) ? options.latency : [30, 120];

  // ---------------------------------------------------------------- constantes (back/src/modules/*/constants)
  var DAY_MS = 86400000;
  var HOUR_MS = 3600000;
  var UNIDENTIFIED_USER_MESSAGE = "Unable to identify the currently signed-in user.";
  var BEER_FAMILIES = ["lager", "pilsner", "paleAle", "ipa", "blonde", "amber", "brown", "stout", "porter", "witbier",
    "weizen", "saison", "trappist", "abbey", "belgianStrong", "sourLambic", "fruit", "nonAlcoholic"];
  var BEER_FAMILY_BY_SEED_LABEL = { Lager: "lager", Pilsner: "pilsner", "Pale Ale": "paleAle", IPA: "ipa",
    Blonde: "blonde", "Ambrée": "amber", Brune: "brown", Stout: "stout", Porter: "porter", Blanche: "witbier",
    Weizen: "weizen", Saison: "saison", Trappiste: "trappist", Abbaye: "abbey", "Belgian Strong": "belgianStrong",
    "Sour / Lambic": "sourLambic", "Fruitée": "fruit", "Sans alcool": "nonAlcoholic" };
  var BEER_AROMAS = ["fruity", "citrus", "hoppy", "floral", "spicy", "caramel", "malty", "roasted", "coffee",
    "chocolate", "honey", "banana", "clove", "sour", "woody", "herbal", "smoky", "biscuit"];
  var BEER_AROMA_BY_SEED_SLUG = { fruite: "fruity", agrumes: "citrus", houblonne: "hoppy", floral: "floral",
    epice: "spicy", caramel: "caramel", malte: "malty", torrefie: "roasted", cafe: "coffee", chocolat: "chocolate",
    miel: "honey", banane: "banana", "clou-de-girofle": "clove", acidulee: "sour", boisee: "woody", herbace: "herbal",
    fume: "smoky", biscuit: "biscuit" };
  var BEER_FORMATS = ["bottle", "can", "draft"];
  var BEER_SORTS = ["name", "abv", "brewery", "rating"];
  var BEER_STATUSES = ["drunk", "wishlist", "untasted"];
  var REVIEW_CRITERIA = ["sweetness", "acidity", "body"];
  var AVATARS = ["hop", "malt", "glass", "mug", "bottle", "can", "barrel", "tap", "cap", "foam", "wheat", "pretzel"];
  var VENUE_TYPES = ["bar", "shop", "brewery"];
  var VOTE_SENSES = ["still", "gone"];
  var STATUS_RANK = { confirmed: 0, maybeGone: 1, unknown: 2, gone: 3 };
  var BITTERNESS_LEVEL_IBU_MAX = [15, 25, 40, 60];
  var COLOR_LEVEL_EBC_MAX = [8, 16, 33, 60];
  var BEER_PAGE_SIZE_DEFAULT = 20;
  var REVIEW_PAGE_SIZE = 10;
  var REVIEW_CRITERION_MIN_REVIEWS = 3;
  var CHECKIN_PAGE_SIZE = 20;
  var CHECKIN_FUTURE_TOLERANCE_MS = 5 * 60000;
  var UPLOAD_MAX_SIZE_BYTES = 5 * 1024 * 1024;
  var AVAILABILITY_WINDOW_DAYS = 30;
  var AVAILABILITY_MIN_VOTES = 2;
  var VOTE_COOLDOWN_HOURS = 24;
  var EARTH_RADIUS_KM = 6371;
  var LEVEL_THRESHOLDS = [0, 5, 15, 30, 60, 100];
  var LEVEL_TITLES = ["curious", "taster", "hopHead", "finePalate", "masterBrewer", "foamLegend"];
  var FEED_PAGE_SIZE = 20;
  var FEED_KIND_ORDER = ["levelUp", "discoveries", "review", "checkin"];
  var COLLECTIONS_PER_USER_MAX = 20;
  var COLLECTION_BEERS_MAX = 200;
  var MONTHLY_CHECKINS_MONTHS = 12;
  var BADGE_TARGETS = { firstSip: 1, explorer: 10, collector: 50, globetrotter: 5, photographer: 10, regular: 3,
    sentinel: 10, cartographer: 1 };
  // F12 : bières communautaires (beers.constants.ts)
  var BEER_NAME_MIN_LENGTH = 2;
  var BEER_NAME_MAX_LENGTH = 80;
  var BREWERY_NAME_MIN_LENGTH = 2;
  var BREWERY_NAME_MAX_LENGTH = 60;
  var BEER_DESCRIPTION_MAX_LENGTH = 500;
  var BEER_PROPOSAL_ABV_MAX_PERCENT = 20;
  var BEER_ABV_MAX_DECIMAL_PLACES = 1;
  var BEER_PROPOSALS_PER_WINDOW_MAX = 10;
  var BEER_PROPOSAL_WINDOW_HOURS = 24;
  var BEER_PROPOSAL_WINDOW_MS = BEER_PROPOSAL_WINDOW_HOURS * HOUR_MS;
  var COUNTRY_CODES = ("AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS " +
    "BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI " +
    "FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR " +
    "IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM " +
    "MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT " +
    "PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM " +
    "TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW").split(" ");
  // F13 : recherche tolérante (common/text/text-search.constants.ts)
  var APPROXIMATE_MIN_WORD_LENGTH = 4;
  var APPROXIMATE_LONG_WORD_LENGTH = 8;
  var APPROXIMATE_SHORT_WORD_MAX_DISTANCE = 1;
  var APPROXIMATE_LONG_WORD_MAX_DISTANCE = 2;

  // ---------------------------------------------------------------- utilitaires
  var COMBINING_MARKS = /\p{M}/gu;
  var normalizeSearchText = function (value) {
    return value.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().split("ß").join("ss")
      .replace(/\s+/g, " ").trim();
  };
  var normalizeLineEndings = function (value) { return value.replace(/\r\n?/g, "\n"); };
  // common/text/levenshtein-distance.ts et matches-approximately.ts (F13)
  var levenshteinDistance = function (a, b) {
    var previousRow = Array.from({ length: b.length + 1 }, function (_, i) { return i; });
    for (var row = 1; row <= a.length; row += 1) {
      var currentRow = [row];
      for (var column = 1; column <= b.length; column += 1) {
        var substitutionCost = a[row - 1] === b[column - 1] ? 0 : 1;
        currentRow.push(Math.min(previousRow[column] + 1, currentRow[column - 1] + 1, previousRow[column - 1] + substitutionCost));
      }
      previousRow = currentRow;
    }
    return previousRow[b.length];
  };
  var toSignificantWords = function (value) {
    return normalizeSearchText(value).split(" ").filter(function (w) { return w.length >= APPROXIMATE_MIN_WORD_LENGTH; });
  };
  var maxDistanceFor = function (word) {
    return word.length >= APPROXIMATE_LONG_WORD_LENGTH ? APPROXIMATE_LONG_WORD_MAX_DISTANCE : APPROXIMATE_SHORT_WORD_MAX_DISTANCE;
  };
  var hasApproximableWord = function (term) { return toSignificantWords(term).length > 0; };
  var matchesApproximately = function (term, texts) {
    var termWords = toSignificantWords(term);
    if (termWords.length === 0) return false;
    var textWords = texts.reduce(function (all, t) { return all.concat(toSignificantWords(t)); }, []);
    return termWords.every(function (termWord) {
      return textWords.some(function (textWord) { return levenshteinDistance(termWord, textWord) <= maxDistanceFor(termWord); });
    });
  };
  var sqlLower = function (value) { return value.replace(/[A-Z]/g, function (c) { return c.toLowerCase(); }); };
  var compareBinary = function (a, b) {
    var i = 0;
    while (i < a.length && i < b.length) {
      var ca = a.codePointAt(i);
      var cb = b.codePointAt(i);
      if (ca !== cb) return ca < cb ? -1 : 1;
      i += ca > 0xffff ? 2 : 1;
    }
    return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
  };
  var sqlRound1 = function (value) { return Math.round(Number((value * 10).toPrecision(12))) / 10; };
  var roundToTenth = function (value) { return Math.round(value * 10) / 10; };
  var iso = function (ms) { return new Date(ms).toISOString(); };
  var toSeconds = function (ms) { return Math.floor(ms / 1000) * 1000; };
  var uniq = function (values) { return Array.from(new Set(values)); };
  var byKey = function (rows, key) {
    var map = new Map();
    rows.forEach(function (row) { map.set(row[key], row); });
    return map;
  };
  var parisFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit",
    day: "2-digit" });
  var parisDayKeyFormat = function (date) {
    var parts = {};
    parisFormat.formatToParts(date).forEach(function (part) { parts[part.type] = part.value; });
    return parts.year + "-" + parts.month + "-" + parts.day;
  };
  var toParisDayKey = function (isoString) { return parisDayKeyFormat(new Date(isoString)); };
  var toParisMonthKey = function (isoString) { return toParisDayKey(isoString).slice(0, 7); };
  var addDaysToDayKey = function (dayKey, days) {
    var p = dayKey.split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2] + days)).toISOString().slice(0, 10);
  };
  var uuidV4 = function () {
    if (root.crypto && typeof root.crypto.randomUUID === "function") return root.crypto.randomUUID();
    var bytes = new Uint8Array(16);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(bytes);
    else for (var i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = Array.from(bytes, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" +
      hex.slice(20);
  };

  function HttpError(status, message) {
    this.status = status;
    this.message = message;
  }
  var badRequest = function (m) { return new HttpError(400, m); };
  var notFound = function (m) { return new HttpError(404, m); };
  var forbidden = function (m) { return new HttpError(403, m); };
  var conflict = function (m) { return new HttpError(409, m); };
  var tooManyRequests = function (m) { return new HttpError(429, m); };

  // ---------------------------------------------------------------- seed (portage de src/database/seed/*.ts)
  var toIdsByLowerName = function (rows) {
    var map = new Map();
    rows.forEach(function (row) { map.set(row.name.toLowerCase(), row.id); });
    return map;
  };
  var seedNowFor = function (key, fallback) {
    var seedNow = options.seedNow;
    if (typeof seedNow === "number") return seedNow;
    if (seedNow && typeof seedNow[key] === "number") return seedNow[key];
    return fallback;
  };
  var buildSeedVotes = function (row, venueBeerId, now) {
    var lastDays = row.lastConfirmedDaysAgo;
    if (lastDays === null) return [];
    var at = function (days, hours) { return now - Math.round(days * DAY_MS) - hours * HOUR_MS; };
    var range = function (count) { return Array.from({ length: count }, function (_, i) { return i; }); };
    var stillCount = row.positiveVotes;
    var goneCount = row.negativeVotes;
    var outsideDays = Math.max(AVAILABILITY_WINDOW_DAYS + 1, lastDays);
    var stillDates;
    var goneDates;
    if (row.status === "confirmed") {
      var step = Math.min(1, (AVAILABILITY_WINDOW_DAYS - 2 - lastDays) / stillCount);
      stillDates = range(stillCount).map(function (i) { return at(lastDays + i * step, 0); });
      goneDates = range(goneCount).map(function (i) { return at(lastDays, 1 + i); });
    } else if (row.status === "maybeGone") {
      stillDates = range(stillCount).map(function (i) { return i === 0 ? at(lastDays, 0) : at(outsideDays + i, 0); });
      goneDates = range(goneCount).map(function (i) {
        return i === 0 ? at(Math.max(0, Math.min(lastDays, AVAILABILITY_WINDOW_DAYS) - 1), 1) : at(outsideDays + i, 0);
      });
    } else {
      stillDates = range(stillCount).map(function (i) { return at(lastDays + i, 0); });
      goneDates = range(goneCount).map(function (i) { return at(1 + 2 * i, 0); });
    }
    return stillDates.map(function (d) { return { venueBeerId: venueBeerId, userId: null, sense: "still", votedAt: d }; })
      .concat(goneDates.map(function (d) { return { venueBeerId: venueBeerId, userId: null, sense: "gone", votedAt: d }; }));
  };

  var buildInitialState = function () {
    var seed = root.__MOUSSE_SEED__;
    if (!seed) throw new Error("mock-api.js : window.__MOUSSE_SEED__ absent (charger seed-data.js avant).");
    var now = Date.now();
    var users = seed.users.map(function (u) { return Object.assign({}, u); });
    var styles = seed.styles.map(function (row, i) {
      return { id: i + 1, name: row.name, family: BEER_FAMILY_BY_SEED_LABEL[row.family], description: row.description,
        ebcMin: row.ebcMin, ebcMax: row.ebcMax, ibuMin: row.ibuMin, ibuMax: row.ibuMax, abvMin: row.abvMin,
        abvMax: row.abvMax };
    });
    var breweries = seed.breweries.map(function (row, i) {
      return { id: i + 1, name: row.name, country: row.country, city: row.city };
    });
    var styleIds = toIdsByLowerName(styles);
    var breweryIds = toIdsByLowerName(breweries);
    var beers = seed.beers.map(function (row, i) {
      return { id: i + 1, name: row.name, breweryId: breweryIds.get(row.breweryName.toLowerCase()),
        styleId: styleIds.get(row.styleName.toLowerCase()), abv: row.abv, ibu: row.ibu, ebc: row.ebc,
        description: row.description, aromas: row.aromas.map(function (s) { return BEER_AROMA_BY_SEED_SLUG[s]; }),
        formats: BEER_FORMATS.filter(function (f) { return row.formats.indexOf(f) !== -1; }), country: row.country,
        searchText: normalizeSearchText(row.name + " " + row.breweryName), createdBy: null, createdAt: null };
    });
    var venues = seed.venues.map(function (row, i) {
      return { id: i + 1, name: row.name, type: row.type, city: row.city, address: row.address,
        latitude: row.latitude, longitude: row.longitude, description: row.description,
        nameKey: row.name.trim().toLocaleLowerCase("fr"), searchName: normalizeSearchText(row.name),
        searchCity: normalizeSearchText(row.city || "") };
    });
    var venueIds = toIdsByLowerName(venues);
    var beerIds = toIdsByLowerName(beers);
    var links = seed.venueBeers.map(function (row, i) {
      return { id: i + 1, venueId: venueIds.get(row.venueName.toLowerCase()), beerId: beerIds.get(row.beerName.toLowerCase()) };
    });
    var votesNow = seedNowFor("votes", now);
    var votes = [];
    seed.venueBeers.forEach(function (row, i) {
      buildSeedVotes(row, links[i].id, votesNow).forEach(function (vote) {
        vote.id = votes.length + 1;
        votes.push(vote);
      });
    });
    var userIdsByName = { Bob: 2, Carol: 3 };
    var reviewsNow = seedNowFor("reviews", now);
    var reviews = seed.reviews.map(function (row, i) {
      var at = reviewsNow - row.daysAgo * DAY_MS;
      return { id: i + 1, userId: userIdsByName[row.userName], beerId: beerIds.get(row.beerName.toLowerCase()),
        rating: row.rating, text: row.text, sweetness: row.sweetness, acidity: row.acidity, body: row.body,
        createdAt: at, updatedAt: at };
    });
    var checkinsNow = seedNowFor("checkins", now);
    var checkins = [];
    seed.demoCheckinUserIds.forEach(function (userId) {
      seed.demoCheckins.forEach(function (row) {
        if (userIdsByName[row.userName] !== userId) return;
        checkins.push({ id: checkins.length + 1, userId: userId, beerId: beerIds.get(row.beerName.toLowerCase()),
          drankAt: checkinsNow - row.daysAgo * DAY_MS, place: row.place,
          venueId: row.venueId !== undefined ? row.venueId : null, rating: row.rating, aromas: [],
          format: row.format, price: null, comment: "", photoId: null });
      });
    });
    var follows = seed.follows.map(function (f, i) {
      return { id: i + 1, followerId: f.followerId, followedId: f.followedId };
    });
    return {
      version: STATE_VERSION,
      users: users, styles: styles, breweries: breweries, beers: beers, venues: venues, links: links, votes: votes,
      reviews: reviews, checkins: checkins, follows: follows, wishlist: [], collections: [], collectionItems: [],
      photos: {},
      seq: { beers: beers.length, breweries: breweries.length, venues: venues.length, links: links.length, votes: votes.length, reviews: reviews.length,
        checkins: checkins.length, follows: follows.length, wishlist: 0, collections: 0, collectionItems: 0 },
    };
  };

  // ---------------------------------------------------------------- état et persistance
  var storage = (function () {
    try { return root.localStorage || null; } catch (e) { return null; }
  })();
  var photoUrls = new Map();
  root.__mockPhotos = photoUrls;
  var state;
  var index;

  var rebuildIndex = function () {
    index = { stylesById: byKey(state.styles, "id"), breweriesById: byKey(state.breweries, "id"),
      beersById: byKey(state.beers, "id"), usersById: byKey(state.users, "id") };
  };
  var loadState = function () {
    if (options.persist !== false && storage) {
      try {
        var raw = storage.getItem(STORAGE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && parsed.version === STATE_VERSION) {
            var urls = parsed.photoUrls || {};
            delete parsed.photoUrls;
            Object.keys(urls).forEach(function (id) { photoUrls.set(id, urls[id]); });
            return parsed;
          }
        }
      } catch (e) { /* état illisible : on repart du seed */ }
    }
    return buildInitialState();
  };
  var saveState = function () {
    if (options.persist === false || !storage) return;
    var photos = {};
    photoUrls.forEach(function (url, id) { if (typeof url === "string" && url.indexOf("data:") === 0) photos[id] = url; });
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(Object.assign({}, state, { photoUrls: photos })));
    } catch (e) {
      try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e2) { /* quota : état non persisté */ }
    }
  };
  state = loadState();
  rebuildIndex();

  root.__mockReset = function () {
    try { if (storage) storage.removeItem(STORAGE_KEY); } catch (e) { /* ignoré */ }
    photoUrls.forEach(function (url) {
      if (typeof url === "string" && url.indexOf("blob:") === 0 && root.URL && URL.revokeObjectURL) {
        try { URL.revokeObjectURL(url); } catch (e) { /* ignoré */ }
      }
    });
    photoUrls.clear();
    state = buildInitialState();
    rebuildIndex();
  };

  var nextId = function (table) {
    state.seq[table] += 1;
    return state.seq[table];
  };

  // ---------------------------------------------------------------- validation (class-validator / class-transformer)
  var eachPrefix = function (rule) { return rule.each ? "each value in " : ""; };
  var rule = function (key, test, message) {
    return function (opts) {
      var each = !!(opts && opts.each);
      return { key: key, each: each, test: test, message: message };
    };
  };
  var isNumberValue = function (value, maxDecimalPlaces) {
    if (typeof value !== "number") return false;
    if (value === Infinity || value === -Infinity) return false;
    if (Number.isNaN(value)) return false;
    if (maxDecimalPlaces !== undefined) {
      var decimals = 0;
      if (value % 1 !== 0) decimals = (value.toString().split(".")[1] || "").length;
      if (decimals > maxDecimalPlaces) return false;
    }
    return Number.isFinite(value);
  };
  var stringLength = function (str) {
    var presentation = str.match(/[^️︎][️︎]/g) || [];
    var surrogates = str.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || [];
    return str.length - presentation.length - surrogates.length;
  };
  var ISO8601 = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/;
  var isValidIsoDate = function (str) {
    var ordinal = str.match(/^(\d{4})-?(\d{3})([ T]{1}\.*|$)/);
    if (ordinal) {
      var oYear = Number(ordinal[1]);
      var oDay = Number(ordinal[2]);
      if ((oYear % 4 === 0 && oYear % 100 !== 0) || oYear % 400 === 0) return oDay <= 366;
      return oDay <= 365;
    }
    var match = str.match(/(\d{4})-?(\d{0,2})-?(\d*)/).map(Number);
    var year = match[1];
    var month = match[2];
    var day = match[3];
    var monthString = month ? ("0" + month).slice(-2) : month;
    var dayString = day ? ("0" + day).slice(-2) : day;
    var d = new Date(year + "-" + (monthString || "01") + "-" + (dayString || "01"));
    if (month && day) return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month && d.getUTCDate() === day;
    return true;
  };
  var IsString = rule("isString", function (v) { return typeof v === "string"; },
    function (p, r) { return eachPrefix(r) + p + " must be a string"; });
  var IsInt = rule("isInt", function (v) { return typeof v === "number" && Number.isInteger(v); },
    function (p, r) { return eachPrefix(r) + p + " must be an integer number"; });
  var IsNumber = function (opts) {
    var max = opts && opts.maxDecimalPlaces;
    return { key: "isNumber", each: false, test: function (v) { return isNumberValue(v, max); },
      message: function (p) { return p + " must be a number conforming to the specified constraints"; } };
  };
  var IsBoolean = rule("isBoolean", function (v) { return typeof v === "boolean"; },
    function (p, r) { return eachPrefix(r) + p + " must be a boolean value"; });
  var IsArray = rule("isArray", function (v) { return Array.isArray(v); },
    function (p, r) { return eachPrefix(r) + p + " must be an array"; });
  var IsPositive = rule("isPositive", function (v) { return typeof v === "number" && v > 0; },
    function (p, r) { return eachPrefix(r) + p + " must be a positive number"; });
  var IsNotEmpty = rule("isNotEmpty", function (v) { return v !== "" && v !== null && v !== undefined; },
    function (p, r) { return eachPrefix(r) + p + " should not be empty"; });
  var IsISO8601 = rule("isIso8601", function (v) { return typeof v === "string" && ISO8601.test(v) && isValidIsoDate(v); },
    function (p, r) { return eachPrefix(r) + p + " must be a valid ISO 8601 date string"; });
  var IsEnum = function (values, opts) {
    var each = !!(opts && opts.each);
    return { key: "isEnum", each: each, test: function (v) { return values.indexOf(v) !== -1; },
      message: function (p, r) { return eachPrefix(r) + p + " must be one of the following values: " + values.join(", "); } };
  };
  var IsIn = function (values) {
    return { key: "isIn", each: false, test: function (v) { return values.indexOf(v) !== -1; },
      message: function (p) { return p + " must be one of the following values: " + values.join(", "); } };
  };
  var Min = function (min, opts) {
    var each = !!(opts && opts.each);
    return { key: "min", each: each, test: function (v) { return typeof v === "number" && v >= min; },
      message: function (p, r) { return eachPrefix(r) + p + " must not be less than " + min; } };
  };
  var Max = function (max, opts) {
    var each = !!(opts && opts.each);
    return { key: "max", each: each, test: function (v) { return typeof v === "number" && v <= max; },
      message: function (p, r) { return eachPrefix(r) + p + " must not be greater than " + max; } };
  };
  var MaxLength = function (max) {
    return { key: "maxLength", each: false, test: function (v) { return typeof v === "string" && stringLength(v) <= max; },
      message: function (p) { return p + " must be shorter than or equal to " + max + " characters"; } };
  };
  var MinLength = function (min) {
    return { key: "minLength", each: false, test: function (v) { return typeof v === "string" && stringLength(v) >= min; },
      message: function (p) { return p + " must be longer than or equal to " + min + " characters"; } };
  };
  var Matches = function (pattern, opts) {
    var each = !!(opts && opts.each);
    return { key: "matches", each: each, test: function (v) { return typeof v === "string" && pattern.test(v); },
      message: function (p, r) { return eachPrefix(r) + p + " must match " + String(pattern) + " regular expression"; } };
  };
  var ArrayMaxSize = function (max) {
    return { key: "arrayMaxSize", each: false, test: function (v) { return Array.isArray(v) && v.length <= max; },
      message: function (p) { return p + " must contain no more than " + max + " elements"; } };
  };
  var ArrayUnique = function () {
    return { key: "arrayUnique", each: false,
      test: function (v) { return Array.isArray(v) && new Set(v).size === v.length; },
      message: function (p) { return "All " + p + "'s elements must be unique"; } };
  };
  var IsMultipleOf = function (step) {
    return { key: "isMultipleOf", each: false, test: function (v) { return typeof v === "number" && v % step === 0; },
      message: function (p) { return p + " must be divisible by " + step; } };
  };

  var toArray = function (v) { return Array.isArray(v) || v === undefined ? v : [v]; };
  var trimString = function (v) { return typeof v === "string" ? v.trim() : v; };
  var toBoolean = function (v) { return v === "true" ? true : v === "false" ? false : v; };
  var toNumber = function (v) {
    if (v === null || v === undefined) return v;
    if (Array.isArray(v)) return v.map(toNumber);
    return Number(v);
  };

  // prop : { name, optional, transform, number, rules (ordre du source, exécutées dans l'ordre inverse comme les décorateurs) }
  var validate = function (schema, plain) {
    var input = plain && typeof plain === "object" ? plain : {};
    var known = new Set(schema.map(function (p) { return p.name; }));
    var object = {};
    Object.keys(input).forEach(function (key) {
      var prop = schema.find(function (p) { return p.name === key; });
      var value = input[key];
      if (prop && prop.transform) value = prop.transform(value);
      if (prop && prop.number) value = toNumber(value);
      object[key] = value;
    });
    var messages = [];
    Object.keys(object).forEach(function (key) {
      if (!known.has(key)) messages.push("property " + key + " should not exist");
    });
    schema.forEach(function (prop) {
      var value = object[prop.name];
      if (prop.optional && (value === null || value === undefined)) return;
      if (prop.supplied && value === undefined) return; // @ValidateIf((_, v) => v !== undefined) : null est validé
      var constraints = {};
      prop.rules.slice().reverse().forEach(function (r) {
        var ok = r.each && Array.isArray(value) ? value.every(r.test) : r.test(value);
        if (!ok) constraints[r.key] = r.message(prop.name, r);
      });
      Object.keys(constraints).forEach(function (k) { messages.push(constraints[k]); });
    });
    if (messages.length > 0) throw badRequest(messages.join("; "));
    return object;
  };

  var NUMERIC_PARAM = /^-?\d+$/;
  var parseIntParam = function (value) {
    if (!NUMERIC_PARAM.test(value) || !isFinite(value)) throw badRequest("Validation failed (numeric string is expected)");
    return parseInt(value, 10);
  };

  var COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
  var BeersQuerySchema = [
    { name: "q", optional: true, rules: [IsString(), MaxLength(100)] },
    { name: "sort", optional: true, rules: [IsEnum(BEER_SORTS)] },
    { name: "page", optional: true, number: true, rules: [IsInt(), Min(1)] },
    { name: "size", optional: true, number: true, rules: [IsInt(), Min(1), Max(50)] },
    { name: "family", optional: true, rules: [IsEnum(BEER_FAMILIES)] },
    { name: "style", optional: true, transform: toArray, number: true,
      rules: [IsArray(), IsInt({ each: true }), Min(1, { each: true })] },
    { name: "country", optional: true, transform: toArray, rules: [IsArray(), Matches(COUNTRY_CODE_PATTERN, { each: true })] },
    { name: "format", optional: true, transform: toArray, rules: [IsArray(), IsEnum(BEER_FORMATS, { each: true })] },
    { name: "abvMin", optional: true, number: true, rules: [IsNumber(), Min(0), Max(14)] },
    { name: "abvMax", optional: true, number: true, rules: [IsNumber(), Min(0), Max(14)] },
    { name: "status", optional: true, rules: [IsEnum(BEER_STATUSES)] },
    { name: "minRating", optional: true, number: true, rules: [IsNumber(), Min(1), Max(5), IsMultipleOf(0.5)] },
  ];
  var PageQuerySchema = [{ name: "page", optional: true, number: true, rules: [IsInt(), Min(1)] }];
  var normalizeText = function (v) { return typeof v === "string" ? normalizeLineEndings(v).trim() : v; };
  var UpsertReviewSchema = [
    { name: "rating", rules: [IsNumber(), Min(1), Max(5), IsMultipleOf(0.5)] },
    { name: "text", optional: true, transform: normalizeText, rules: [IsString(), MaxLength(500)] },
    { name: "sweetness", optional: true, rules: [IsInt(), Min(1), Max(5)] },
    { name: "acidity", optional: true, rules: [IsInt(), Min(1), Max(5)] },
    { name: "body", optional: true, rules: [IsInt(), Min(1), Max(5)] },
  ];
  var PositionQuerySchema = [
    { name: "latitude", optional: true, number: true, rules: [IsNumber(), Min(-90), Max(90)] },
    { name: "longitude", optional: true, number: true, rules: [IsNumber(), Min(-180), Max(180)] },
  ];
  var BeerIdBodySchema = [{ name: "beerId", rules: [IsInt(), Min(1)] }];
  var splitAromas = function (v) { return typeof v !== "string" ? v : v === "" ? [] : v.split(","); };
  var normalizeComment = function (v) { return typeof v === "string" ? normalizeLineEndings(v) : v; };
  var CreateCheckinSchema = [
    { name: "beerId", number: true, rules: [IsInt(), Min(1)] },
    { name: "drankAt", rules: [IsISO8601()] },
    { name: "place", transform: trimString, rules: [IsString(), IsNotEmpty(), MaxLength(80)] },
    { name: "venueId", optional: true, number: true, rules: [IsInt(), Min(1)] },
    { name: "rating", optional: true, number: true, rules: [IsNumber(), Min(0.5), Max(5), IsMultipleOf(0.5)] },
    { name: "aromas", optional: true, transform: splitAromas,
      rules: [IsArray(), ArrayMaxSize(5), ArrayUnique(), IsEnum(BEER_AROMAS, { each: true })] },
    { name: "format", rules: [IsEnum(BEER_FORMATS)] },
    { name: "price", optional: true, number: true, rules: [IsNumber({ maxDecimalPlaces: 2 }), Min(0), Max(1000)] },
    { name: "comment", optional: true, transform: normalizeComment, rules: [IsString(), MaxLength(500)] },
  ];
  // UpdateCheckinDto (F13) : JSON, sans @Type ; supplied = @ValidateIf(v !== undefined), optional = @IsOptional
  var UpdateCheckinSchema = [
    { name: "drankAt", supplied: true, rules: [IsISO8601()] },
    { name: "place", supplied: true, transform: trimString, rules: [IsString(), IsNotEmpty(), MaxLength(80)] },
    { name: "venueId", optional: true, rules: [IsInt(), Min(1)] },
    { name: "rating", optional: true, rules: [IsNumber(), Min(0.5), Max(5), IsMultipleOf(0.5)] },
    { name: "aromas", supplied: true, rules: [IsArray(), ArrayMaxSize(5), ArrayUnique(), IsEnum(BEER_AROMAS, { each: true })] },
    { name: "format", supplied: true, rules: [IsEnum(BEER_FORMATS)] },
    { name: "price", optional: true, rules: [IsNumber({ maxDecimalPlaces: 2 }), Min(0), Max(1000)] },
    { name: "comment", supplied: true, transform: normalizeComment, rules: [IsString(), MaxLength(500)] },
  ];
  var toSingleLine = function (v) { return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : v; };
  var CreateBeerSchema = [
    { name: "name", transform: toSingleLine,
      rules: [IsString(), MinLength(BEER_NAME_MIN_LENGTH), MaxLength(BEER_NAME_MAX_LENGTH)] },
    { name: "breweryName", transform: toSingleLine,
      rules: [IsString(), MinLength(BREWERY_NAME_MIN_LENGTH), MaxLength(BREWERY_NAME_MAX_LENGTH)] },
    { name: "country", rules: [IsIn(COUNTRY_CODES)] },
    { name: "styleId", rules: [IsInt(), Min(1)] },
    { name: "abv", rules: [IsNumber({ maxDecimalPlaces: BEER_ABV_MAX_DECIMAL_PLACES }), Min(0), Max(BEER_PROPOSAL_ABV_MAX_PERCENT)] },
    { name: "description", optional: true, transform: normalizeText, rules: [IsString(), MaxLength(BEER_DESCRIPTION_MAX_LENGTH)] },
  ];
  var CheckinsQuerySchema = [
    { name: "beerId", optional: true, number: true, rules: [IsInt(), Min(1)] },
    { name: "page", optional: true, number: true, rules: [IsInt(), Min(1)] },
  ];
  var VenuesQuerySchema = [
    { name: "q", optional: true, transform: trimString, rules: [IsString(), MaxLength(100)] },
    { name: "north", optional: true, number: true, rules: [IsNumber(), Min(-90), Max(90)] },
    { name: "south", optional: true, number: true, rules: [IsNumber(), Min(-90), Max(90)] },
    { name: "east", optional: true, number: true, rules: [IsNumber(), Min(-180), Max(180)] },
    { name: "west", optional: true, number: true, rules: [IsNumber(), Min(-180), Max(180)] },
    { name: "type", optional: true, transform: toArray, rules: [IsArray(), IsEnum(VENUE_TYPES, { each: true })] },
    { name: "beer", optional: true, number: true, rules: [IsInt(), Min(1)] },
    { name: "family", optional: true, rules: [IsEnum(BEER_FAMILIES)] },
    { name: "style", optional: true, transform: toArray, number: true,
      rules: [IsArray(), IsInt({ each: true }), Min(1, { each: true })] },
    { name: "confirmedOnly", optional: true, transform: toBoolean, rules: [IsBoolean()] },
    { name: "undiscovered", optional: true, transform: toBoolean, rules: [IsBoolean()] },
    { name: "visited", optional: true, transform: toBoolean, rules: [IsBoolean()] },
    { name: "latitude", optional: true, number: true, rules: [IsNumber(), Min(-90), Max(90)] },
    { name: "longitude", optional: true, number: true, rules: [IsNumber(), Min(-180), Max(180)] },
    { name: "radiusKm", optional: true, number: true, rules: [IsNumber(), IsPositive(), Max(50)] },
  ];
  var VenueBeersQuerySchema = [{ name: "family", optional: true, rules: [IsEnum(BEER_FAMILIES)] }];
  var CreateVenueSchema = [
    { name: "name", transform: trimString, rules: [IsString(), IsNotEmpty(), MaxLength(80)] },
    { name: "type", rules: [IsEnum(VENUE_TYPES)] },
    { name: "address", transform: trimString, rules: [IsString(), IsNotEmpty(), MaxLength(160)] },
    { name: "latitude", rules: [IsNumber(), Min(-90), Max(90)] },
    { name: "longitude", rules: [IsNumber(), Min(-180), Max(180)] },
    { name: "city", optional: true, rules: [IsString(), MaxLength(60)] },
    { name: "description", optional: true, rules: [IsString(), MaxLength(300)] },
  ];
  var CreateVoteSchema = [{ name: "sense", rules: [IsEnum(VOTE_SENSES)] }];
  var UpdateProfileSchema = [
    { name: "displayName", transform: trimString, rules: [IsString(), MinLength(2), MaxLength(24)] },
    { name: "avatar", rules: [IsEnum(AVATARS)] },
  ];
  var SaveCollectionSchema = [{ name: "name", transform: trimString, rules: [IsString(), IsNotEmpty(), MaxLength(40)] }];
  var MyCollectionsQuerySchema = [{ name: "beerId", optional: true, number: true, rules: [IsInt(), Min(1)] }];

  // ---------------------------------------------------------------- utilisateurs
  var getUsers = function () {
    return state.users.slice().sort(function (a, b) { return compareBinary(a.displayName, b.displayName) || a.id - b.id; })
      .map(toUserDto);
  };
  var toUserDto = function (u) { return { id: u.id, displayName: u.displayName, avatarColor: u.avatarColor, avatar: u.avatar }; };
  var getUser = function (userId) {
    var user = index.usersById.get(userId);
    if (!user) throw notFound("User " + userId + " not found.");
    return toUserDto(user);
  };

  // ---------------------------------------------------------------- catalogue (beers)
  var toLevel = function (value, bounds) {
    var i = bounds.findIndex(function (b) { return value <= b; });
    return i === -1 ? bounds.length + 1 : i + 1;
  };
  var toBeerDto = function (beer) {
    var style = index.stylesById.get(beer.styleId);
    var brewery = index.breweriesById.get(beer.breweryId);
    return {
      id: beer.id, name: beer.name, breweryName: brewery.name, country: beer.country, styleId: style.id,
      styleName: style.name, family: style.family, abv: beer.abv, aromas: beer.aromas.slice(),
      formats: beer.formats.slice(), description: beer.description,
      bitternessLevel: beer.ibu === null ? null : toLevel(beer.ibu, BITTERNESS_LEVEL_IBU_MAX),
      colorLevel: beer.ebc === null ? null : toLevel(beer.ebc, COLOR_LEVEL_EBC_MAX),
      styleColorRange: beer.ebc === null
        ? { min: toLevel(style.ebcMin, COLOR_LEVEL_EBC_MAX), max: toLevel(style.ebcMax, COLOR_LEVEL_EBC_MAX) } : null,
      source: beer.createdBy === null ? "official" : "community", createdBy: beer.createdBy,
    };
  };
  var getBeer = function (id) {
    var beer = index.beersById.get(id);
    if (!beer) throw notFound("Beer " + id + " not found.");
    return toBeerDto(beer);
  };
  var getBeersByIds = function (ids) {
    var wanted = new Set(ids);
    return state.beers.filter(function (b) { return wanted.has(b.id); }).map(toBeerDto);
  };
  var ratingSummaries = function () {
    var acc = new Map();
    state.reviews.forEach(function (r) {
      var cur = acc.get(r.beerId) || { sum: 0, count: 0 };
      cur.sum += r.rating;
      cur.count += 1;
      acc.set(r.beerId, cur);
    });
    var out = new Map();
    acc.forEach(function (v, beerId) {
      out.set(beerId, { beerId: beerId, averageRating: sqlRound1(v.sum / v.count), reviewCount: v.count });
    });
    return out;
  };
  var applyConditions = function (search, filters, summaries) {
    var term = normalizeSearchText(search);
    return state.beers.filter(function (beer) {
      var style = index.stylesById.get(beer.styleId);
      if (term !== "" && beer.searchText.indexOf(term) === -1) return false;
      if (filters.family !== undefined && style.family !== filters.family) return false;
      if (filters.styleIds !== undefined && filters.styleIds.indexOf(style.id) === -1) return false;
      if (filters.countries !== undefined && filters.countries.indexOf(beer.country) === -1) return false;
      if (filters.formats !== undefined && !filters.formats.some(function (f) { return beer.formats.indexOf(f) !== -1; })) return false;
      if (filters.abvMin !== undefined && !(beer.abv >= filters.abvMin)) return false;
      if (filters.abvMax !== undefined && !(beer.abv <= filters.abvMax)) return false;
      if (filters.minRating !== undefined) {
        var summary = summaries.get(beer.id);
        if (!summary || !(summary.averageRating >= filters.minRating)) return false;
      }
      if (filters.beerIds !== undefined && filters.beerIds.indexOf(beer.id) === -1) return false;
      if (filters.excludedBeerIds !== undefined && filters.excludedBeerIds.indexOf(beer.id) !== -1) return false;
      if (filters.officialOnly === true && beer.createdBy !== null) return false;
      return true;
    });
  };
  var countBy = function (values) {
    var map = new Map();
    values.forEach(function (v) { map.set(v, (map.get(v) || 0) + 1); });
    return map;
  };
  var findFacets = function (search, filters, summaries) {
    var familyRows = applyConditions(search, Object.assign({}, filters, { family: undefined, styleIds: undefined }), summaries);
    var familyCounts = countBy(familyRows.map(function (b) { return index.stylesById.get(b.styleId).family; }));
    var families = BEER_FAMILIES.filter(function (f) { return familyCounts.has(f); })
      .map(function (f) { return { value: f, count: familyCounts.get(f) }; });
    var countryRows = applyConditions(search, Object.assign({}, filters, { countries: undefined }), summaries);
    var countryCounts = countBy(countryRows.map(function (b) { return b.country; }));
    var countries = Array.from(countryCounts.keys()).map(function (c) { return { value: c, count: countryCounts.get(c) }; })
      .sort(function (a, b) { return b.count - a.count || compareBinary(a.value, b.value); });
    var formatRows = applyConditions(search, Object.assign({}, filters, { formats: undefined }), summaries);
    var formats = BEER_FORMATS.map(function (f) {
      return { value: f, count: formatRows.filter(function (b) { return b.formats.indexOf(f) !== -1; }).length };
    }).filter(function (f) { return f.count > 0; });
    return { families: families, countries: countries, formats: formats };
  };
  var getCatalogTotals = function () {
    var facets = findFacets("", { officialOnly: true }, ratingSummaries());
    return { total: facets.families.reduce(function (s, f) { return s + f.count; }, 0), families: facets.families };
  };
  var sortBeers = function (rows, sort, summaries) {
    var nameKey = function (b) { return sqlLower(b.name); };
    var comparators = {
      name: function (a, b) { return compareBinary(nameKey(a), nameKey(b)); },
      abv: function (a, b) { return b.abv - a.abv || compareBinary(nameKey(a), nameKey(b)); },
      brewery: function (a, b) {
        return compareBinary(sqlLower(index.breweriesById.get(a.breweryId).name), sqlLower(index.breweriesById.get(b.breweryId).name)) ||
          compareBinary(nameKey(a), nameKey(b));
      },
      rating: function (a, b) {
        var sa = summaries.get(a.id);
        var sb = summaries.get(b.id);
        var na = sa ? 0 : 1;
        var nb = sb ? 0 : 1;
        if (na !== nb) return na - nb;
        if (sa && sb) {
          if (sa.averageRating !== sb.averageRating) return sb.averageRating - sa.averageRating;
          if (sa.reviewCount !== sb.reviewCount) return sb.reviewCount - sa.reviewCount;
        }
        return compareBinary(nameKey(a), nameKey(b));
      },
    };
    return rows.slice().sort(function (a, b) { return comparators[sort](a, b) || a.id - b.id; });
  };
  var getBeerStates = function (userId, beerIds) {
    var counts = countBy(state.checkins.filter(function (c) { return c.userId === userId; }).map(function (c) { return c.beerId; }));
    var wished = new Set(state.wishlist.filter(function (w) { return w.userId === userId; }).map(function (w) { return w.beerId; }));
    return beerIds.map(function (beerId) {
      var count = counts.get(beerId) || 0;
      return { beerId: beerId, drunk: count > 0, checkinCount: count, inWishlist: wished.has(beerId) };
    });
  };
  var getDrunkBeerIds = function (userId) {
    return uniq(state.checkins.filter(function (c) { return c.userId === userId; }).map(function (c) { return c.beerId; }))
      .sort(function (a, b) { return a - b; });
  };
  var getWishlistBeerIds = function (userId) {
    return state.wishlist.filter(function (w) { return w.userId === userId; }).map(function (w) { return w.beerId; })
      .sort(function (a, b) { return a - b; });
  };
  var findAuthorName = function (beer) {
    if (beer.createdBy === null) return null;
    var author = index.usersById.get(beer.createdBy);
    return author ? author.displayName : null;
  };
  var toCatalogBeerDto = function (beer, st, summary) {
    return Object.assign(beer, { createdByName: findAuthorName(beer),
      drunk: st ? st.drunk : false, checkinCount: st ? st.checkinCount : 0, inWishlist: st ? st.inWishlist : false,
      averageRating: summary ? summary.averageRating : null, reviewCount: summary ? summary.reviewCount : 0,
    });
  };

  var getBeers = function (userId, query) {
    var page = query.page !== undefined ? query.page : 1;
    var size = query.size !== undefined ? query.size : BEER_PAGE_SIZE_DEFAULT;
    var search = query.q !== undefined ? query.q.trim() : "";
    var filters = { family: query.family, styleIds: query.style, countries: query.country, formats: query.format,
      abvMin: query.abvMin, abvMax: query.abvMax, minRating: query.minRating };
    if (filters.abvMin !== undefined && filters.abvMax !== undefined && filters.abvMin > filters.abvMax) {
      throw badRequest("abvMin must not be greater than abvMax.");
    }
    if (query.status === "drunk") filters.beerIds = getDrunkBeerIds(userId);
    if (query.status === "wishlist") filters.beerIds = getWishlistBeerIds(userId);
    if (query.status === "untasted") filters.excludedBeerIds = getDrunkBeerIds(userId);
    var summaries = ratingSummaries();
    var sort = query.sort !== undefined ? query.sort : "name";
    var found = findBeersPage(search, filters, sort, summaries);
    var rows = found.rows;
    var slice = rows.slice((page - 1) * size, (page - 1) * size + size);
    var states = byKey(getBeerStates(userId, slice.map(function (b) { return b.id; })), "beerId");
    var items = slice.map(function (b) { return toCatalogBeerDto(toBeerDto(b), states.get(b.id), summaries.get(b.id)); });
    return { items: items, total: rows.length, page: page, size: size, facets: found.facets, isApproximate: found.isApproximate };
  };
  // beers.service.ts findBeersPage (F13) : repli tolérant quand la recherche exacte, filtres compris, ne rend rien.
  var findBeersPage = function (search, filters, sort, summaries) {
    var rows = sortBeers(applyConditions(search, filters, summaries), sort, summaries);
    var facets = findFacets(search, filters, summaries);
    if (rows.length > 0 || !hasApproximableWord(search)) return { rows: rows, facets: facets, isApproximate: false };
    var beerIds = applyConditions("", filters, summaries).sort(function (a, b) { return a.id - b.id; })
      .filter(function (b) { return matchesApproximately(search, [b.searchText]); }).map(function (b) { return b.id; });
    if (beerIds.length === 0) return { rows: rows, facets: facets, isApproximate: false };
    var approximateFilters = Object.assign({}, filters, { beerIds: beerIds });
    return { rows: sortBeers(applyConditions("", approximateFilters, summaries), sort, summaries),
      facets: findFacets("", approximateFilters, summaries), isApproximate: true };
  };
  var getBreweries = function () {
    return state.breweries.slice().sort(function (a, b) { return compareBinary(sqlLower(a.name), sqlLower(b.name)) || a.id - b.id; })
      .map(function (b) { return { id: b.id, name: b.name, country: b.country }; });
  };
  // beers.service.ts createBeer (F12) : 404 style -> 429 quota -> brasserie réutilisée ou créée -> 409 doublon.
  var createBeer = function (userId, dto) {
    if (!state.styles.some(function (st) { return st.id === dto.styleId; })) throw notFound("Beer style " + dto.styleId + " not found.");
    var since = Date.now() - BEER_PROPOSAL_WINDOW_MS;
    var recent = state.beers.filter(function (b) { return b.createdBy === userId && b.createdAt !== null && b.createdAt >= since; });
    if (recent.length >= BEER_PROPOSALS_PER_WINDOW_MAX) {
      throw tooManyRequests("You can propose at most " + BEER_PROPOSALS_PER_WINDOW_MAX + " beers every " +
        BEER_PROPOSAL_WINDOW_HOURS + " hours.");
    }
    var breweryKey = normalizeSearchText(dto.breweryName);
    var brewery = getBreweries().find(function (b) { return normalizeSearchText(b.name) === breweryKey; });
    var breweryId;
    if (brewery === undefined) {
      breweryId = nextId("breweries");
      state.breweries.push({ id: breweryId, name: dto.breweryName, country: dto.country, city: "" });
    } else {
      var nameKey = normalizeSearchText(dto.name);
      if (state.beers.some(function (b) { return b.breweryId === brewery.id && normalizeSearchText(b.name) === nameKey; })) {
        throw conflict("A beer named \"" + nameKey + "\" already exists for brewery \"" + brewery.name + "\".");
      }
      breweryId = brewery.id;
    }
    var id = nextId("beers");
    state.beers.push({ id: id, name: dto.name, breweryId: breweryId, styleId: dto.styleId, abv: dto.abv, ibu: null, ebc: null,
      description: dto.description !== undefined && dto.description !== null ? dto.description : "", aromas: [], formats: [],
      country: dto.country, searchText: normalizeSearchText(dto.name + " " + dto.breweryName), createdBy: userId,
      createdAt: Date.now() });
    rebuildIndex();
    return getBeerForUser(userId, id);
  };

  var findReviewStats = function (beerId) {
    var reviews = state.reviews.filter(function (r) { return r.beerId === beerId; });
    var ratingDistribution = [1, 2, 3, 4, 5].map(function (stars) {
      return { stars: stars, count: reviews.filter(function (r) { return Math.trunc(r.rating + 0.5) === stars; }).length };
    });
    var criteria = REVIEW_CRITERIA.map(function (criterion) {
      var values = reviews.map(function (r) { return r[criterion]; }).filter(function (v) { return v !== null && v !== undefined; });
      var average = values.length === 0 ? null : sqlRound1(values.reduce(function (s, v) { return s + v; }, 0) / values.length);
      return { criterion: criterion, average: values.length < REVIEW_CRITERION_MIN_REVIEWS ? null : average, count: values.length };
    });
    return { ratingDistribution: ratingDistribution, criteria: criteria };
  };
  var getBeerForUser = function (userId, id) {
    var beer = getBeer(id);
    var st = getBeerStates(userId, [id])[0];
    var summary = ratingSummaries().get(id);
    var stats = findReviewStats(id);
    var dto = toCatalogBeerDto(beer, st, summary);
    dto.ratingDistribution = stats.ratingDistribution;
    dto.criteria = stats.criteria;
    return dto;
  };
  var getStyleGroups = function () {
    var styles = state.styles.slice().sort(function (a, b) { return compareBinary(a.name, b.name) || a.id - b.id; });
    return BEER_FAMILIES.map(function (family) {
      return { family: family, styles: styles.filter(function (s) { return s.family === family; })
        .map(function (s) { return { id: s.id, name: s.name, description: s.description }; }) };
    });
  };

  // ---------------------------------------------------------------- avis
  var compareReviewsRecent = function (a, b) { return b.updatedAt - a.updatedAt || b.id - a.id; };
  var toReviewDto = function (record, author, currentUserId) {
    return { id: record.id, beerId: record.beerId, authorId: record.userId, authorName: author.displayName,
      authorAvatarColor: author.avatarColor, authorAvatar: author.avatar, rating: record.rating, text: record.text,
      sweetness: record.sweetness, acidity: record.acidity, body: record.body, createdAt: iso(record.createdAt),
      updatedAt: iso(record.updatedAt), isMine: record.userId === currentUserId };
  };
  var getReviewPage = function (userId, beerId, query) {
    getBeer(beerId);
    var page = query.page !== undefined ? query.page : 1;
    var mine = state.reviews.find(function (r) { return r.userId === userId && r.beerId === beerId; }) || null;
    var others = state.reviews.filter(function (r) { return r.beerId === beerId && r.userId !== userId; }).sort(compareReviewsRecent);
    var slice = others.slice((page - 1) * REVIEW_PAGE_SIZE, page * REVIEW_PAGE_SIZE);
    var authors = byKey(getUsers(), "id");
    return { mine: mine === null ? null : toReviewDto(mine, authors.get(mine.userId), userId),
      items: slice.map(function (r) { return toReviewDto(r, authors.get(r.userId), userId); }),
      total: others.length, page: page, size: REVIEW_PAGE_SIZE };
  };
  var hasCheckin = function (userId, beerId) {
    return state.checkins.some(function (c) { return c.userId === userId && c.beerId === beerId; });
  };
  var saveMyReview = function (userId, beerId, dto) {
    getBeer(beerId);
    var existing = state.reviews.find(function (r) { return r.userId === userId && r.beerId === beerId; });
    if (!existing && !hasCheckin(userId, beerId)) throw forbidden("You must check in this beer before reviewing it.");
    var now = Date.now();
    var fields = { rating: dto.rating, text: normalizeLineEndings(dto.text !== undefined && dto.text !== null ? dto.text : "").trim(),
      sweetness: dto.sweetness !== undefined ? dto.sweetness : null, acidity: dto.acidity !== undefined ? dto.acidity : null,
      body: dto.body !== undefined ? dto.body : null, updatedAt: now };
    var record;
    var insertId = nextId("reviews");
    if (existing) {
      record = Object.assign(existing, fields);
    } else {
      record = Object.assign({ id: insertId, userId: userId, beerId: beerId, createdAt: now }, fields);
      state.reviews.push(record);
    }
    return toReviewDto(record, getUser(userId), userId);
  };
  var deleteMyReview = function (userId, beerId) {
    getBeer(beerId);
    var i = state.reviews.findIndex(function (r) { return r.userId === userId && r.beerId === beerId; });
    if (i === -1) throw notFound("You have not reviewed beer " + beerId + ".");
    state.reviews.splice(i, 1);
  };

  // ---------------------------------------------------------------- dégustations, dex, liste d'envies
  var compareChrono = function (a, b) { return a.drankAt - b.drankAt || a.id - b.id; };
  var toCheckinRecord = function (c) {
    return { id: c.id, userId: c.userId, beerId: c.beerId, drankAt: iso(c.drankAt), place: c.place,
      venueId: c.venueId === undefined ? null : c.venueId, rating: c.rating,
      aromas: c.aromas.slice(), format: c.format, price: c.price, comment: c.comment, photoId: c.photoId };
  };
  var toCheckinDto = function (record, beerName) {
    return { id: record.id, beerId: record.beerId, beerName: beerName, drankAt: record.drankAt, place: record.place,
      venueId: record.venueId, rating: record.rating, aromas: record.aromas, format: record.format, price: record.price, comment: record.comment,
      photoId: record.photoId };
  };
  var getUserCheckins = function (userId) {
    return state.checkins.filter(function (c) { return c.userId === userId; }).sort(compareChrono).map(toCheckinRecord);
  };
  var getCheckinsByUsers = function (userIds) {
    return state.checkins.filter(function (c) { return userIds.indexOf(c.userId) !== -1; }).sort(compareChrono).map(toCheckinRecord);
  };
  var getDiscoveries = function (userId) {
    var byBeer = new Map();
    state.checkins.forEach(function (c) {
      if (c.userId !== userId) return;
      var cur = byBeer.get(c.beerId);
      if (!cur) byBeer.set(c.beerId, { beerId: c.beerId, first: c.drankAt, last: c.drankAt });
      else { cur.first = Math.min(cur.first, c.drankAt); cur.last = Math.max(cur.last, c.drankAt); }
    });
    return Array.from(byBeer.values()).sort(function (a, b) { return b.first - a.first || a.beerId - b.beerId; })
      .map(function (d) { return { beerId: d.beerId, firstCheckinAt: iso(d.first), lastCheckinAt: iso(d.last) }; });
  };

  var detectPhotoContentType = function (bytes) {
    var has = function (offset, list) { return list.every(function (b, i) { return bytes[offset + i] === b; }); };
    if (has(0, [0xff, 0xd8, 0xff])) return "image/jpeg";
    if (has(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
    if (has(0, [0x52, 0x49, 0x46, 0x46]) && has(8, [0x57, 0x45, 0x42, 0x50])) return "image/webp";
    return null;
  };
  var bytesToDataUrl = function (bytes, contentType) {
    var binary = "";
    for (var i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode.apply(null, Array.prototype.slice.call(bytes.subarray(i, i + 0x8000)));
    }
    return "data:" + contentType + ";base64," + root.btoa(binary);
  };

  var createCheckin = function (userId, dto, photo) {
    if (Date.parse(dto.drankAt) > Date.now() + CHECKIN_FUTURE_TOLERANCE_MS) throw badRequest("drankAt must not be in the future.");
    var contentType = null;
    if (photo) {
      contentType = detectPhotoContentType(photo.bytes);
      if (contentType === null) throw badRequest("The photo must be a JPEG, PNG or WebP image.");
    }
    var beer = getBeer(dto.beerId);
    if (dto.venueId !== undefined) ensureVenueExists(dto.venueId);
    var isFirstDiscovery = !hasCheckin(userId, beer.id);
    var photoId = null;
    if (photo) {
      photoId = uuidV4();
      state.photos[photoId] = { contentType: contentType };
      photoUrls.set(photoId, bytesToDataUrl(photo.bytes, contentType));
    }
    var checkin = { id: nextId("checkins"), userId: userId, beerId: dto.beerId, drankAt: new Date(dto.drankAt).getTime(),
      place: dto.place.trim(), venueId: dto.venueId !== undefined && dto.venueId !== null ? dto.venueId : null,
      rating: dto.rating !== undefined && dto.rating !== null ? dto.rating : null,
      aromas: (dto.aromas || []).slice(), format: dto.format,
      price: dto.price !== undefined && dto.price !== null ? dto.price : null,
      comment: dto.comment !== undefined && dto.comment !== null ? dto.comment : "", photoId: photoId };
    state.checkins.push(checkin);
    return { checkin: toCheckinDto(toCheckinRecord(checkin), beer.name), isFirstDiscovery: isFirstDiscovery };
  };
  var getCheckins = function (userId, query) {
    var page = query.page !== undefined ? query.page : 1;
    var rows = state.checkins.filter(function (c) {
      return c.userId === userId && (query.beerId === undefined || c.beerId === query.beerId);
    }).sort(function (a, b) { return b.drankAt - a.drankAt || b.id - a.id; });
    var slice = rows.slice((page - 1) * CHECKIN_PAGE_SIZE, page * CHECKIN_PAGE_SIZE).map(toCheckinRecord);
    var names = new Map(getBeersByIds(uniq(slice.map(function (r) { return r.beerId; }))).map(function (b) { return [b.id, b.name]; }));
    return { items: slice.map(function (r) { return toCheckinDto(r, names.get(r.beerId) || ""); }), total: rows.length,
      page: page, size: CHECKIN_PAGE_SIZE };
  };
  var getOwnedCheckin = function (userId, id) {
    var checkin = state.checkins.find(function (c) { return c.id === id; });
    if (!checkin) throw notFound("Check-in " + id + " not found.");
    if (checkin.userId !== userId) throw forbidden("You can only access your own check-ins.");
    return checkin;
  };
  var getCheckin = function (userId, id) {
    var checkin = getOwnedCheckin(userId, id);
    return toCheckinDto(toCheckinRecord(checkin), getBeer(checkin.beerId).name);
  };
  // pokedex.service.ts updateCheckin (F13) : corps vide -> date future -> venueId sans place -> 404/403 -> 404 lieu.
  var updateCheckin = function (userId, id, dto) {
    if (!Object.keys(dto).some(function (k) { return dto[k] !== undefined; })) throw badRequest("At least one field must be supplied.");
    if (dto.drankAt !== undefined && Date.parse(dto.drankAt) > Date.now() + CHECKIN_FUTURE_TOLERANCE_MS) {
      throw badRequest("drankAt must not be in the future.");
    }
    var linkedVenueId = dto.venueId !== undefined && dto.venueId !== null ? dto.venueId : null;
    if (linkedVenueId !== null && dto.place === undefined) throw badRequest("venueId requires place.");
    var checkin = getOwnedCheckin(userId, id);
    if (linkedVenueId !== null) ensureVenueExists(linkedVenueId);
    var beer = getBeer(checkin.beerId);
    if (dto.drankAt !== undefined) checkin.drankAt = new Date(dto.drankAt).getTime();
    if (dto.place !== undefined) checkin.place = dto.place.trim();
    if (dto.place !== undefined || dto.venueId !== undefined) checkin.venueId = linkedVenueId;
    if (dto.rating !== undefined) checkin.rating = dto.rating;
    if (dto.aromas !== undefined) checkin.aromas = dto.aromas.slice();
    if (dto.format !== undefined) checkin.format = dto.format;
    if (dto.price !== undefined) checkin.price = dto.price;
    if (dto.comment !== undefined) checkin.comment = dto.comment;
    return toCheckinDto(toCheckinRecord(checkin), beer.name);
  };
  var deleteCheckin = function (userId, id) {
    var checkin = getOwnedCheckin(userId, id);
    var i = state.checkins.indexOf(checkin);
    state.checkins.splice(i, 1);
    if (checkin.photoId !== null) {
      delete state.photos[checkin.photoId];
      photoUrls.delete(checkin.photoId);
    }
  };
  var getDex = function (userId) {
    var discoveries = getDiscoveries(userId);
    var totals = getCatalogTotals();
    var discovered = getBeersByIds(discoveries.map(function (d) { return d.beerId; }))
      .filter(function (b) { return b.source === "official"; });
    var officialIds = new Set(discovered.map(function (b) { return b.id; }));
    var totalsByFamily = new Map(totals.families.map(function (f) { return [f.value, f.count]; }));
    return {
      discovered: discoveries.filter(function (d) { return officialIds.has(d.beerId); }).length, total: totals.total,
      families: BEER_FAMILIES.map(function (family) {
        return { family: family, discovered: discovered.filter(function (b) { return b.family === family; }).length,
          total: totalsByFamily.get(family) || 0 };
      }),
      beers: discoveries,
    };
  };
  var getWishlistRecords = function (userId) {
    return state.wishlist.filter(function (w) { return w.userId === userId; })
      .sort(function (a, b) { return b.addedAt - a.addedAt || b.id - a.id; })
      .map(function (w) { return { beerId: w.beerId, addedAt: iso(w.addedAt) }; });
  };
  var getWishlist = function (userId) {
    var records = getWishlistRecords(userId);
    var names = new Map(getBeersByIds(records.map(function (r) { return r.beerId; })).map(function (b) { return [b.id, b.name]; }));
    return records.map(function (r) { return { beerId: r.beerId, beerName: names.get(r.beerId) || "", addedAt: r.addedAt }; });
  };
  var addToWishlist = function (userId, dto) {
    var beer = getBeer(dto.beerId);
    if (state.wishlist.some(function (w) { return w.userId === userId && w.beerId === beer.id; })) {
      throw conflict("Beer " + beer.id + " is already in the wishlist.");
    }
    var item = { id: nextId("wishlist"), userId: userId, beerId: beer.id, addedAt: toSeconds(Date.now()) };
    state.wishlist.push(item);
    return { beerId: item.beerId, beerName: beer.name, addedAt: iso(item.addedAt) };
  };
  var removeFromWishlist = function (userId, beerId) {
    var i = state.wishlist.findIndex(function (w) { return w.userId === userId && w.beerId === beerId; });
    if (i === -1) throw notFound("Beer " + beerId + " is not in the wishlist.");
    state.wishlist.splice(i, 1);
  };

  // ---------------------------------------------------------------- lieux et disponibilité
  var toRadians = function (deg) { return (deg * Math.PI) / 180; };
  var computeDistanceKm = function (from, to) {
    var dLat = toRadians(to.latitude - from.latitude);
    var dLon = toRadians(to.longitude - from.longitude);
    var h = Math.pow(Math.sin(dLat / 2), 2) +
      Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.pow(Math.sin(dLon / 2), 2);
    return Math.round(2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h)) * 100) / 100;
  };
  var newestOf = function (votes) {
    return votes.reduce(function (newest, v) { return newest === null || v.votedAt > newest.votedAt ? v : newest; }, null);
  };
  var computeAvailability = function (votes, now) {
    var inside = votes.filter(function (v) { return now - v.votedAt <= AVAILABILITY_WINDOW_DAYS * DAY_MS; });
    var latestByUser = new Map();
    inside.forEach(function (v) {
      if (v.userId === null) return;
      var cur = latestByUser.get(v.userId);
      if (cur === undefined || v.votedAt > cur.votedAt) latestByUser.set(v.userId, v);
    });
    var remaining = inside.filter(function (v) { return v.userId === null || latestByUser.get(v.userId) === v; });
    var status;
    var latest = newestOf(remaining);
    if (latest === null) status = "unknown";
    else {
      var still = remaining.filter(function (v) { return v.sense === "still"; }).length;
      var gone = remaining.length - still;
      if (gone >= AVAILABILITY_MIN_VOTES && gone > still) status = "gone";
      else if (latest.sense !== "still" || still === gone) status = "maybeGone";
      else if (still >= AVAILABILITY_MIN_VOTES && still > gone) status = "confirmed";
      else status = "unknown";
    }
    var lastStill = newestOf(votes.filter(function (v) { return v.sense === "still"; }));
    return { status: status, lastConfirmedAt: lastStill ? lastStill.votedAt : null, recentVoterCount: remaining.length };
  };
  var pickBestStatus = function (statuses) {
    return statuses.reduce(function (best, s) { return STATUS_RANK[s] < STATUS_RANK[best] ? s : best; }, statuses[0] || "unknown");
  };
  var computeNextVoteAt = function (votes, userId, now) {
    var latest = newestOf(votes.filter(function (v) { return v.userId === userId; }));
    if (latest === null) return null;
    var next = latest.votedAt + VOTE_COOLDOWN_HOURS * HOUR_MS;
    return next > now ? next : null;
  };
  var linkWithVotes = function (link) {
    return { id: link.id, venueId: link.venueId, beerId: link.beerId,
      votes: state.votes.filter(function (v) { return v.venueBeerId === link.id; }).sort(function (a, b) { return a.id - b.id; }) };
  };
  var findLinks = function (predicate) {
    return state.links.filter(predicate).sort(function (a, b) { return a.id - b.id; }).map(linkWithVotes);
  };
  var toVenueRecord = function (v) {
    return { id: v.id, name: v.name, type: v.type, city: v.city === null || v.city === undefined ? "" : v.city,
      address: v.address, latitude: v.latitude, longitude: v.longitude,
      description: v.description === null || v.description === undefined ? "" : v.description };
  };
  var toVenueDto = function (record, status, distanceKm, visit, isApproximateMatch) {
    return { id: record.id, name: record.name, type: record.type, city: record.city, address: record.address,
      latitude: record.latitude, longitude: record.longitude, description: record.description, distanceKm: distanceKm,
      status: status, checkinCount: visit ? visit.checkinCount : 0, lastCheckinAt: visit ? visit.lastCheckinAt : null,
      isApproximateMatch: isApproximateMatch };
  };
  // tastings.repository.ts findVenueVisits (F11) : COUNT(*) et MAX(drankAt) des dégustations de l'utilisateur par lieu.
  var getVisits = function (userId, venueIds) {
    var wanted = new Set(venueIds);
    var acc = new Map();
    state.checkins.forEach(function (c) {
      if (c.userId !== userId || c.venueId === null || c.venueId === undefined || !wanted.has(c.venueId)) return;
      var cur = acc.get(c.venueId);
      if (!cur) acc.set(c.venueId, { venueId: c.venueId, checkinCount: 1, last: c.drankAt });
      else { cur.checkinCount += 1; cur.last = Math.max(cur.last, c.drankAt); }
    });
    var out = new Map();
    acc.forEach(function (v, venueId) {
      out.set(venueId, { venueId: venueId, checkinCount: v.checkinCount, lastCheckinAt: iso(v.last) });
    });
    return out;
  };
  var groupByVenue = function (links) {
    var map = new Map();
    links.forEach(function (l) { map.set(l.venueId, (map.get(l.venueId) || []).concat([l])); });
    return map;
  };
  var toVenueWithStatus = function (record, links, now, distanceKm, visit, isApproximateMatch) {
    return toVenueDto(record, pickBestStatus(links.map(function (l) { return computeAvailability(l.votes, now).status; })), distanceKm,
      visit, isApproximateMatch);
  };
  var toPosition = function (query) {
    if (query.latitude === undefined && query.longitude === undefined) return null;
    if (query.latitude === undefined || query.longitude === undefined) {
      throw badRequest("latitude and longitude must be supplied together.");
    }
    return { latitude: query.latitude, longitude: query.longitude };
  };
  var hasBeerFilter = function (q) { return q.beer !== undefined || q.family !== undefined || q.style !== undefined; };
  var matchesBeerFilter = function (beer, q) {
    return (q.beer === undefined || beer.id === q.beer) && (q.family === undefined || beer.family === q.family) &&
      (q.style === undefined || q.style.indexOf(beer.styleId) !== -1);
  };
  var findVenues = function (bounds, types, search) {
    var rows = state.venues.filter(function (v) {
      if (bounds !== null && !(v.latitude >= bounds.south && v.latitude <= bounds.north &&
        v.longitude >= bounds.west && v.longitude <= bounds.east)) return false;
      if (types.length > 0 && types.indexOf(v.type) === -1) return false;
      return true;
    });
    var term = normalizeSearchText(search);
    if (term === "") {
      rows.sort(function (a, b) { return compareBinary(a.name, b.name) || a.id - b.id; });
    } else {
      rows = rows.filter(function (v) { return v.searchName.indexOf(term) !== -1 || v.searchCity.indexOf(term) !== -1; });
      var relevance = function (v) { return v.searchName.indexOf(term) === 0 ? 0 : v.searchName.indexOf(term) !== -1 ? 1 : 2; };
      rows.sort(function (a, b) { return relevance(a) - relevance(b) || compareBinary(a.searchName, b.searchName) || a.id - b.id; });
    }
    return rows.map(toVenueRecord);
  };
  var getVenues = function (userId, query) {
    var supplied = [query.north, query.south, query.east, query.west].filter(function (b) { return b !== undefined; }).length;
    var bounds = null;
    if (supplied > 0) {
      if (supplied < 4) throw badRequest("north, south, east and west must be supplied together.");
      if (query.south > query.north) throw badRequest("south must not be greater than north.");
      if (query.west > query.east) throw badRequest("west must not be greater than east.");
      bounds = { north: query.north, south: query.south, east: query.east, west: query.west };
    }
    var types = query.type || [];
    var search = query.q !== undefined ? query.q : "";
    var position = toPosition(query);
    var radiusKm = null;
    if (query.radiusKm !== undefined) {
      if (position === null) throw badRequest("radiusKm requires latitude and longitude.");
      radiusKm = query.radiusKm;
    }
    var records = findVenues(bounds, types, search);
    var venues = toFilteredVenues(userId, query, records, position, radiusKm, false);
    if (venues.length > 0 || !hasApproximableWord(search)) {
      if (position === null || search !== "") return venues;
      return venues.sort(function (a, b) { return a.distanceKm - b.distanceKm || a.name.localeCompare(b.name, "fr"); });
    }
    // F13 : repli tolérant sur les mots du nom et de la ville, filtres compris, sans tri par distance.
    var closeRecords = findVenues(bounds, types, "").filter(function (r) { return matchesApproximately(search, [r.name, r.city]); });
    return toFilteredVenues(userId, query, closeRecords, position, radiusKm, true);
  };
  var toFilteredVenues = function (userId, query, records, position, radiusKm, isApproximateMatch) {
    var recordIds = new Set(records.map(function (r) { return r.id; }));
    var links = findLinks(function (l) { return recordIds.has(l.venueId); });
    var retained = links;
    if (hasBeerFilter(query)) {
      var matching = new Set(getBeersByIds(uniq(links.map(function (l) { return l.beerId; })))
        .filter(function (b) { return matchesBeerFilter(b, query); }).map(function (b) { return b.id; }));
      retained = links.filter(function (l) { return matching.has(l.beerId); });
    }
    var undiscovered = retained;
    if (query.undiscovered === true) {
      var drunk = new Set(getDrunkBeerIds(userId));
      undiscovered = retained.filter(function (l) { return !drunk.has(l.beerId); });
    }
    var linksByVenue = groupByVenue(retained);
    var undiscoveredIds = new Set(undiscovered.map(function (l) { return l.venueId; }));
    var visits = getVisits(userId, records.map(function (r) { return r.id; }));
    var now = Date.now();
    return records
      .filter(function (r) { return !hasBeerFilter(query) || linksByVenue.has(r.id); })
      .filter(function (r) { return query.undiscovered !== true || undiscoveredIds.has(r.id); })
      .filter(function (r) { return query.visited !== true || (visits.has(r.id) && visits.get(r.id).checkinCount > 0); })
      .map(function (r) {
        return toVenueWithStatus(r, linksByVenue.get(r.id) || [], now, position === null ? null : computeDistanceKm(position, r),
          visits.get(r.id), isApproximateMatch);
      })
      .filter(function (v) { return query.confirmedOnly !== true || v.status === "confirmed"; })
      .filter(function (v) { return radiusKm === null || v.distanceKm <= radiusKm; });
  };
  var getVenueRecord = function (id) {
    var venue = state.venues.find(function (v) { return v.id === id; });
    if (!venue) throw notFound("Venue " + id + " not found.");
    return toVenueRecord(venue);
  };
  var ensureVenueExists = function (id) { getVenueRecord(id); };
  var getVenue = function (userId, id) {
    var record = getVenueRecord(id);
    var links = findLinks(function (l) { return l.venueId === id; });
    return toVenueWithStatus(record, links, Date.now(), null, getVisits(userId, [id]).get(id), false);
  };
  var getBeerVenues = function (beerId, query) {
    var position = toPosition(query);
    getBeer(beerId);
    var links = findLinks(function (l) { return l.beerId === beerId; });
    var venueIds = new Set(links.map(function (l) { return l.venueId; }));
    var venues = state.venues.filter(function (v) { return venueIds.has(v.id); }).sort(function (a, b) { return a.id - b.id; })
      .map(toVenueRecord);
    var linksByVenue = groupByVenue(links);
    var now = Date.now();
    var rows = venues.map(function (venue) {
      var votes = (linksByVenue.get(venue.id) || []).reduce(function (all, l) { return all.concat(l.votes); }, []);
      var availability = computeAvailability(votes, now);
      return { venueId: venue.id, venueName: venue.name, venueType: venue.type, city: venue.city, address: venue.address,
        latitude: venue.latitude, longitude: venue.longitude, status: availability.status,
        lastConfirmedAt: availability.lastConfirmedAt === null ? null : iso(availability.lastConfirmedAt),
        recentVoterCount: availability.recentVoterCount,
        distanceKm: position === null ? null : computeDistanceKm(position, venue) };
    });
    var compareNames = function (a, b) { return a.venueName.localeCompare(b.venueName, "fr"); };
    var confirmation = function (r) { return r.lastConfirmedAt === null ? -Infinity : new Date(r.lastConfirmedAt).getTime(); };
    var byAvailability = function (a, b) {
      return STATUS_RANK[a.status] - STATUS_RANK[b.status] || confirmation(b) - confirmation(a) || compareNames(a, b);
    };
    var byDistance = function (a, b) { return a.distanceKm - b.distanceKm || compareNames(a, b); };
    return rows.sort(position === null ? byAvailability : byDistance);
  };
  var getVenueUserStates = function (userId, beerIds) {
    var states = byKey(getBeerStates(userId, beerIds), "beerId");
    var discoveries = byKey(getDiscoveries(userId), "beerId");
    var map = new Map();
    beerIds.forEach(function (beerId) {
      var st = states.get(beerId);
      var count = st ? st.checkinCount : 0;
      var d = discoveries.get(beerId);
      map.set(beerId, { drunk: count > 0, checkinCount: count, lastCheckinAt: d ? d.lastCheckinAt : null });
    });
    return map;
  };
  var toVenueBeerDto = function (link, beer, availability, nextVoteAt, userState) {
    return { beerId: link.beerId, beerName: beer.name, breweryName: beer.breweryName, styleName: beer.styleName,
      family: beer.family, status: availability.status,
      lastConfirmedAt: availability.lastConfirmedAt === null ? null : iso(availability.lastConfirmedAt),
      recentVoterCount: availability.recentVoterCount, nextVoteAt: nextVoteAt === null ? null : iso(nextVoteAt),
      drunk: userState.drunk, checkinCount: userState.checkinCount, lastCheckinAt: userState.lastCheckinAt };
  };
  var getVenueBeers = function (userId, venueId, query) {
    getVenueRecord(venueId);
    var links = findLinks(function (l) { return l.venueId === venueId; });
    var beers = new Map(getBeersByIds(links.map(function (l) { return l.beerId; }))
      .filter(function (b) { return query.family === undefined || b.family === query.family; }).map(function (b) { return [b.id, b]; }));
    var userStates = getVenueUserStates(userId, links.map(function (l) { return l.beerId; }));
    var now = Date.now();
    return links.reduce(function (out, link) {
      var beer = beers.get(link.beerId);
      if (beer) {
        out.push(toVenueBeerDto(link, beer, computeAvailability(link.votes, now), computeNextVoteAt(link.votes, userId, now),
          userStates.get(link.beerId)));
      }
      return out;
    }, []).sort(function (a, b) {
      return BEER_FAMILIES.indexOf(a.family) - BEER_FAMILIES.indexOf(b.family) || a.beerName.localeCompare(b.beerName, "fr");
    });
  };
  var getLink = function (venueId, beerId) {
    var link = state.links.find(function (l) { return l.venueId === venueId && l.beerId === beerId; });
    if (!link) throw notFound("Beer " + beerId + " is not listed at venue " + venueId + ".");
    return linkWithVotes(link);
  };
  var vote = function (userId, venueId, beerId, dto) {
    getVenueRecord(venueId);
    var link = getLink(venueId, beerId);
    var now = Date.now();
    var mine = link.votes.filter(function (v) { return v.userId === userId; })
      .sort(function (a, b) { return b.votedAt - a.votedAt || b.id - a.id; });
    var cooldownEnd = mine.length === 0 ? null : computeNextVoteAt([mine[0]], userId, now);
    if (cooldownEnd !== null) {
      var hours = Math.ceil((cooldownEnd - now) / HOUR_MS);
      throw conflict("You already voted for this beer here in the last 24 hours. Try again in " + hours + " " +
        (hours === 1 ? "hour" : "hours") + ".");
    }
    state.votes.push({ id: nextId("votes"), venueBeerId: link.id, userId: userId, sense: dto.sense, votedAt: now });
    var updated = getLink(venueId, beerId);
    var beer = getBeer(beerId);
    return toVenueBeerDto(updated, beer, computeAvailability(updated.votes, now), computeNextVoteAt(updated.votes, userId, now),
      getVenueUserStates(userId, [beerId]).get(beerId));
  };
  var createVenue = function (dto) {
    var name = dto.name.trim();
    var nameKey = name.toLocaleLowerCase("fr");
    if (state.venues.some(function (v) { return v.nameKey === nameKey; })) {
      throw conflict("A venue named \"" + name + "\" already exists.");
    }
    var city = dto.city !== undefined && dto.city !== null ? dto.city : null;
    var venue = { id: nextId("venues"), name: name, type: dto.type, city: city, address: dto.address.trim(),
      latitude: dto.latitude, longitude: dto.longitude,
      description: dto.description !== undefined && dto.description !== null ? dto.description : null,
      nameKey: nameKey, searchName: normalizeSearchText(name), searchCity: normalizeSearchText(city || "") };
    state.venues.push(venue);
    return toVenueDto(toVenueRecord(venue), "unknown", null, undefined, false);
  };
  var reportBeer = function (userId, venueId, dto) {
    getVenueRecord(venueId);
    var beer = getBeer(dto.beerId);
    if (state.links.some(function (l) { return l.venueId === venueId && l.beerId === dto.beerId; })) {
      throw conflict("Beer " + dto.beerId + " is already listed at venue " + venueId + ".");
    }
    var link = { id: nextId("links"), venueId: venueId, beerId: dto.beerId };
    state.links.push(link);
    return toVenueBeerDto({ id: link.id, venueId: venueId, beerId: dto.beerId, votes: [] }, beer,
      computeAvailability([], Date.now()), null, getVenueUserStates(userId, [dto.beerId]).get(dto.beerId));
  };
  var getUserVotes = function (userId) {
    return state.votes.filter(function (v) { return v.userId === userId; })
      .sort(function (a, b) { return a.votedAt - b.votedAt || a.id - b.id; });
  };

  // ---------------------------------------------------------------- profil : stats et badges
  var averageOf = function (values) {
    return values.length === 0 ? null : roundToTenth(values.reduce(function (s, v) { return s + v; }, 0) / values.length);
  };
  var computeDayStreaks = function (dayKeys, todayKey) {
    var days = uniq(dayKeys).sort();
    var best = 0;
    var run = 0;
    var previous = null;
    days.forEach(function (day) {
      run = previous !== null && addDaysToDayKey(previous, 1) === day ? run + 1 : 1;
      best = Math.max(best, run);
      previous = day;
    });
    var endsRecently = previous === todayKey || previous === addDaysToDayKey(todayKey, -1);
    return { current: endsRecently ? run : 0, best: best };
  };
  var findStreakCompletionDayKey = function (dayKeys, length) {
    var days = uniq(dayKeys).sort();
    var run = 0;
    var previous = null;
    for (var i = 0; i < days.length; i += 1) {
      run = previous !== null && addDaysToDayKey(previous, 1) === days[i] ? run + 1 : 1;
      if (run === length) return days[i];
      previous = days[i];
    }
    return null;
  };
  var lastTwelveMonthKeys = function (now) {
    var p = toParisMonthKey(new Date(now).toISOString()).split("-").map(Number);
    var current = p[0] * 12 + (p[1] - 1);
    return Array.from({ length: MONTHLY_CHECKINS_MONTHS }, function (_, position) {
      var idx = current - (MONTHLY_CHECKINS_MONTHS - 1 - position);
      return Math.floor(idx / 12) + "-" + String((idx % 12) + 1).padStart(2, "0");
    });
  };
  var getStats = function (userId) {
    var checkins = getUserCheckins(userId);
    var beers = getBeersByIds(uniq(checkins.map(function (c) { return c.beerId; })));
    var beersById = byKey(beers, "id");
    var ratings = checkins.filter(function (c) { return c.rating !== null; }).map(function (c) { return c.rating; });
    var now = Date.now();
    var streaks = computeDayStreaks(checkins.map(function (c) { return toParisDayKey(c.drankAt); }), parisDayKeyFormat(new Date(now)));
    var countryCounts = new Map();
    beers.forEach(function (b) { countryCounts.set(b.country, (countryCounts.get(b.country) || 0) + 1); });
    var countries = Array.from(countryCounts.entries()).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); })
      .map(function (e) { return { country: e[0], count: e[1] }; });
    var familyCounts = new Map();
    checkins.forEach(function (c) {
      var beer = beersById.get(c.beerId);
      if (beer) familyCounts.set(beer.family, (familyCounts.get(beer.family) || 0) + 1);
    });
    var favorite = null;
    var favoriteCount = 0;
    BEER_FAMILIES.forEach(function (family) {
      var count = familyCounts.get(family) || 0;
      if (count > favoriteCount) { favorite = family; favoriteCount = count; }
    });
    var monthCounts = new Map();
    checkins.forEach(function (c) {
      var month = toParisMonthKey(c.drankAt);
      monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
    });
    return {
      checkinCount: checkins.length, discoveredCount: beers.length,
      averageAbv: averageOf(beers.map(function (b) { return b.abv; })), countries: countries, favoriteFamily: favorite,
      averageRating: averageOf(ratings), currentStreak: streaks.current, bestStreak: streaks.best,
      monthlyCheckins: lastTwelveMonthKeys(now).map(function (m) { return { month: m, count: monthCounts.get(m) || 0 }; }),
    };
  };
  var toBadgeDto = function (src) {
    return { id: src.kind === "specialist" ? "specialist-" + src.family : src.kind, kind: src.kind, family: src.family,
      unlocked: src.unlockedAt !== null, unlockedAt: src.unlockedAt, current: src.current, target: src.target,
      comingSoon: src.comingSoon };
  };
  var progressTowards = function (target, dates) {
    return { current: Math.min(dates.length, target), unlockedAt: target > 0 && dates.length >= target ? dates[target - 1] : null };
  };
  var badge = function (kind, family, target, progress, comingSoon) {
    return toBadgeDto({ kind: kind, family: family, target: target, comingSoon: !!comingSoon, current: progress.current,
      unlockedAt: progress.unlockedAt });
  };
  var getBadges = function (userId) {
    var checkins = getUserCheckins(userId);
    var votes = getUserVotes(userId);
    var totals = getCatalogTotals();
    var beersById = byKey(getBeersByIds(uniq(checkins.map(function (c) { return c.beerId; }))), "id");
    var seen = new Set();
    var discoveries = [];
    checkins.forEach(function (c) {
      var beer = beersById.get(c.beerId);
      if (beer && !seen.has(beer.id)) { seen.add(beer.id); discoveries.push({ drankAt: c.drankAt, beer: beer }); }
    });
    var discoveryDates = discoveries.map(function (d) { return d.drankAt; });
    var officialDiscoveries = discoveries.filter(function (d) { return d.beer.source === "official"; });
    var officialDiscoveryDates = officialDiscoveries.map(function (d) { return d.drankAt; });
    var totalsByFamily = new Map(totals.families.map(function (f) { return [f.value, f.count]; }));
    var countries = new Set();
    var globetrotterAt = null;
    discoveries.forEach(function (d) {
      countries.add(d.beer.country);
      if (globetrotterAt === null && countries.size >= BADGE_TARGETS.globetrotter) globetrotterAt = d.drankAt;
    });
    var now = Date.now();
    var dayKeys = checkins.map(function (c) { return toParisDayKey(c.drankAt); });
    var completionDay = findStreakCompletionDayKey(dayKeys, BADGE_TARGETS.regular);
    var completion = checkins.find(function (c) { return toParisDayKey(c.drankAt) === completionDay; });
    var best = computeDayStreaks(dayKeys, parisDayKeyFormat(new Date(now))).best;
    var photoDates = checkins.filter(function (c) { return c.photoId !== null; }).map(function (c) { return c.drankAt; });
    return [
      badge("firstSip", null, BADGE_TARGETS.firstSip, progressTowards(BADGE_TARGETS.firstSip, discoveryDates)),
      badge("explorer", null, BADGE_TARGETS.explorer, progressTowards(BADGE_TARGETS.explorer, discoveryDates)),
      badge("collector", null, 50, progressTowards(50, discoveryDates)),
      badge("completionist", null, totals.total, progressTowards(totals.total, officialDiscoveryDates)),
      badge("globetrotter", null, BADGE_TARGETS.globetrotter,
        { current: Math.min(countries.size, BADGE_TARGETS.globetrotter), unlockedAt: globetrotterAt }),
    ].concat(BEER_FAMILIES.map(function (family) {
      var target = totalsByFamily.get(family) || 0;
      var dates = officialDiscoveries.filter(function (d) { return d.beer.family === family; }).map(function (d) { return d.drankAt; });
      return badge("specialist", family, target, progressTowards(target, dates));
    })).concat([
      badge("photographer", null, BADGE_TARGETS.photographer, progressTowards(BADGE_TARGETS.photographer, photoDates)),
      badge("regular", null, BADGE_TARGETS.regular,
        { current: Math.min(best, BADGE_TARGETS.regular), unlockedAt: completion ? completion.drankAt : null }),
      badge("sentinel", null, BADGE_TARGETS.sentinel,
        progressTowards(BADGE_TARGETS.sentinel, votes.map(function (v) { return iso(v.votedAt); }))),
      badge("cartographer", null, BADGE_TARGETS.cartographer, { current: 0, unlockedAt: null }, true),
    ]);
  };

  // ---------------------------------------------------------------- social : niveaux, profils, fil
  var levelOf = function (discoveredCount) {
    var effective = Math.max(discoveredCount, 0);
    var level = LEVEL_THRESHOLDS.filter(function (t) { return effective >= t; }).length;
    var nextThreshold = LEVEL_THRESHOLDS[level] !== undefined ? LEVEL_THRESHOLDS[level] : null;
    return { level: level, title: LEVEL_TITLES[level - 1], discoveredCount: discoveredCount,
      currentThreshold: LEVEL_THRESHOLDS[level - 1], nextThreshold: nextThreshold,
      nextTitle: nextThreshold === null ? null : LEVEL_TITLES[level] };
  };
  var isFollowing = function (followerId, followedId) {
    return state.follows.some(function (f) { return f.followerId === followerId && f.followedId === followedId; });
  };
  var followingIdsOf = function (userId) {
    return state.follows.filter(function (f) { return f.followerId === userId; }).sort(function (a, b) { return a.id - b.id; })
      .map(function (f) { return f.followedId; });
  };
  var followerIdsOf = function (userId) {
    return state.follows.filter(function (f) { return f.followedId === userId; }).sort(function (a, b) { return a.id - b.id; })
      .map(function (f) { return f.followerId; });
  };
  var discoveredCounts = function (userIds) {
    var map = new Map();
    userIds.forEach(function (id) {
      var count = getDrunkBeerIds(id).length;
      if (count > 0) map.set(id, count);
    });
    return map;
  };
  var getProfile = function (currentUserId, userId) {
    var user = getUser(userId);
    var level = levelOf(getDrunkBeerIds(userId).length);
    var isMe = currentUserId === userId;
    return { id: user.id, displayName: user.displayName, avatar: user.avatar, level: level.level, title: level.title,
      discoveredCount: level.discoveredCount, currentThreshold: level.currentThreshold, nextThreshold: level.nextThreshold,
      nextTitle: level.nextTitle, followerCount: followerIdsOf(userId).length, followingCount: followingIdsOf(userId).length,
      isFollowed: isMe ? false : isFollowing(currentUserId, userId), isMe: isMe };
  };
  var toSummaries = function (currentUserId, users) {
    var counts = discoveredCounts(users.map(function (u) { return u.id; }));
    return users.map(function (u) {
      var level = levelOf(counts.get(u.id) || 0);
      return { id: u.id, displayName: u.displayName, avatar: u.avatar, level: level.level, title: level.title,
        discoveredCount: level.discoveredCount, isFollowed: isFollowing(currentUserId, u.id), isMe: u.id === currentUserId };
    }).sort(function (a, b) { return a.displayName.localeCompare(b.displayName) || a.id - b.id; });
  };
  var usersAmong = function (ids) {
    var wanted = new Set(ids);
    return getUsers().filter(function (u) { return wanted.has(u.id); });
  };
  var updateMyProfile = function (userId, dto) {
    getUser(userId);
    var user = index.usersById.get(userId);
    user.displayName = dto.displayName.trim();
    user.avatar = dto.avatar;
    return getProfile(userId, userId);
  };
  var follow = function (currentUserId, userId) {
    if (currentUserId === userId) throw badRequest("You cannot follow yourself.");
    getUser(userId);
    if (isFollowing(currentUserId, userId)) throw conflict("You already follow user " + userId + ".");
    state.follows.push({ id: nextId("follows"), followerId: currentUserId, followedId: userId });
    return getProfile(currentUserId, userId);
  };
  var unfollow = function (currentUserId, userId) {
    if (currentUserId === userId) throw badRequest("You cannot unfollow yourself.");
    getUser(userId);
    var i = state.follows.findIndex(function (f) { return f.followerId === currentUserId && f.followedId === userId; });
    if (i === -1) throw notFound("You do not follow user " + userId + ".");
    state.follows.splice(i, 1);
  };

  var feedEvent = function (fields) {
    return Object.assign({ beerId: null, place: null, rating: null, photoId: null, isDiscovery: false, discoveryCount: null,
      reachedLevel: null, reachedTitle: null, reviewText: null }, fields);
  };
  var buildFeedEvents = function (checkins, reviews) {
    var chronological = checkins.slice().sort(function (a, b) { return Date.parse(a.drankAt) - Date.parse(b.drankAt) || a.id - b.id; });
    var discovered = new Set();
    var discoveries = chronological.filter(function (r) {
      var key = r.userId + ":" + r.beerId;
      var isDiscovery = !discovered.has(key);
      discovered.add(key);
      return isDiscovery;
    });
    var discoveryIds = new Set(discoveries.map(function (r) { return r.id; }));
    var events = chronological.map(function (r) {
      return feedEvent({ id: "checkin-" + r.id, kind: "checkin", userId: r.userId, occurredAt: r.drankAt, beerId: r.beerId,
        place: r.place, rating: r.rating, photoId: r.photoId, isDiscovery: discoveryIds.has(r.id) });
    });
    var groups = new Map();
    discoveries.forEach(function (r) {
      var key = r.userId + ":" + toParisDayKey(r.drankAt);
      groups.set(key, (groups.get(key) || []).concat([r]));
    });
    groups.forEach(function (group) {
      if (group.length < 2) return;
      events.push(feedEvent({ id: "discoveries-" + group[0].userId + "-" + toParisDayKey(group[0].drankAt), kind: "discoveries",
        userId: group[0].userId, occurredAt: group[group.length - 1].drankAt, discoveryCount: group.length }));
    });
    var countByUser = new Map();
    discoveries.forEach(function (r) {
      var count = (countByUser.get(r.userId) || 0) + 1;
      countByUser.set(r.userId, count);
      var level = levelOf(count);
      if (level.level > 1 && level.currentThreshold === count) {
        events.push(feedEvent({ id: "levelUp-" + r.userId + "-" + level.level, kind: "levelUp", userId: r.userId,
          occurredAt: r.drankAt, reachedLevel: level.level, reachedTitle: level.title }));
      }
    });
    reviews.forEach(function (rv) {
      events.push(feedEvent({ id: "review-" + rv.id, kind: "review", userId: rv.userId, occurredAt: iso(rv.updatedAt),
        beerId: rv.beerId, rating: rv.rating, reviewText: rv.text }));
    });
    return events;
  };
  var getFeed = function (userId, query) {
    var page = query.page !== undefined ? query.page : 1;
    var followingIds = followingIdsOf(userId).filter(function (id) { return id !== userId; });
    var checkins = getCheckinsByUsers(followingIds);
    var reviews = state.reviews.filter(function (r) { return followingIds.indexOf(r.userId) !== -1; }).sort(compareReviewsRecent);
    var events = buildFeedEvents(checkins, reviews).sort(function (a, b) {
      return Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || FEED_KIND_ORDER.indexOf(a.kind) - FEED_KIND_ORDER.indexOf(b.kind) ||
        b.id.localeCompare(a.id, undefined, { numeric: true });
    });
    var start = (page - 1) * FEED_PAGE_SIZE;
    var slice = events.slice(start, start + FEED_PAGE_SIZE);
    var authorIds = uniq(slice.map(function (e) { return e.userId; }));
    var beerNames = new Map(getBeersByIds(uniq(slice.map(function (e) { return e.beerId; }).filter(function (id) { return id !== null; })))
      .map(function (b) { return [b.id, b.name]; }));
    var counts = discoveredCounts(authorIds);
    var actors = new Map();
    getUsers().filter(function (u) { return authorIds.indexOf(u.id) !== -1; }).forEach(function (u) {
      var level = levelOf(counts.get(u.id) || 0);
      actors.set(u.id, { id: u.id, displayName: u.displayName, avatar: u.avatar, level: level.level, title: level.title });
    });
    var items = [];
    slice.forEach(function (e) {
      var actor = actors.get(e.userId);
      if (!actor) return;
      items.push({ id: e.id, kind: e.kind, occurredAt: e.occurredAt, actor: actor, beerId: e.beerId,
        beerName: e.beerId !== null && beerNames.has(e.beerId) ? beerNames.get(e.beerId) : null, place: e.place,
        rating: e.rating, photoId: e.photoId, isDiscovery: e.isDiscovery, discoveryCount: e.discoveryCount,
        reachedLevel: e.reachedLevel, reachedTitle: e.reachedTitle, reviewText: e.reviewText });
    });
    return { items: items, total: events.length, page: page, size: FEED_PAGE_SIZE };
  };

  // ---------------------------------------------------------------- collections
  var normalizeCollectionName = function (name) { return name.trim().toLocaleLowerCase("fr"); };
  var collectionSummaries = function (predicate) {
    return state.collections.filter(predicate).sort(function (a, b) { return a.createdAt - b.createdAt || a.id - b.id; })
      .map(function (c) {
        return { id: c.id, kind: "custom", name: c.name,
          beerCount: state.collectionItems.filter(function (i) { return i.collectionId === c.id; }).length };
      });
  };
  var getOwnedCollection = function (userId, id) {
    var summary = collectionSummaries(function (c) { return c.userId === userId && c.id === id; })[0];
    if (!summary) throw notFound("Collection " + id + " not found.");
    return summary;
  };
  var ensureCanRead = function (currentUserId, userId) {
    if (currentUserId !== userId && !isFollowing(currentUserId, userId)) {
      throw forbidden("You must follow this user to see their collections.");
    }
  };
  var existsCollectionName = function (userId, name, exceptId) {
    var wanted = normalizeCollectionName(name);
    return state.collections.some(function (c) {
      return c.userId === userId && c.id !== exceptId && normalizeCollectionName(c.name) === wanted;
    });
  };
  var wishlistSummary = function (count) { return { id: null, kind: "wishlist", name: "", beerCount: count }; };
  var toCollectionBeers = function (currentUserId, items) {
    var ids = items.map(function (i) { return i.beerId; });
    var beers = getBeersByIds(ids);
    var drunk = new Set(getBeerStates(currentUserId, ids).filter(function (s) { return s.drunk; }).map(function (s) { return s.beerId; }));
    return items.reduce(function (out, item) {
      var beer = beers.find(function (b) { return b.id === item.beerId; });
      if (beer) {
        out.push({ beerId: beer.id, beerName: beer.name, styleName: beer.styleName, family: beer.family,
          drunkByMe: drunk.has(item.beerId), addedAt: item.addedAt });
      }
      return out;
    }, []);
  };
  var toCollectionDetail = function (summary, ownerId, beers) {
    return { id: summary.id, kind: summary.kind, name: summary.name, ownerId: ownerId, beers: beers };
  };
  var getUserCollections = function (currentUserId, userId) {
    getUser(userId);
    ensureCanRead(currentUserId, userId);
    return [wishlistSummary(getWishlistBeerIds(userId).length)]
      .concat(collectionSummaries(function (c) { return c.userId === userId; }));
  };
  var getCollectionDetail = function (currentUserId, userId, collectionId) {
    getUser(userId);
    var summary = getOwnedCollection(userId, collectionId);
    ensureCanRead(currentUserId, userId);
    var items = state.collectionItems.filter(function (i) { return i.collectionId === collectionId; })
      .sort(function (a, b) { return b.addedAt - a.addedAt || b.id - a.id; })
      .map(function (i) { return { beerId: i.beerId, addedAt: iso(i.addedAt) }; });
    return toCollectionDetail(summary, userId, toCollectionBeers(currentUserId, items));
  };
  var getWishlistDetail = function (currentUserId, userId) {
    getUser(userId);
    ensureCanRead(currentUserId, userId);
    var items = getWishlistRecords(userId);
    return toCollectionDetail(wishlistSummary(items.length), userId, toCollectionBeers(currentUserId, items));
  };
  var createCollection = function (userId, dto) {
    if (state.collections.filter(function (c) { return c.userId === userId; }).length >= COLLECTIONS_PER_USER_MAX) {
      throw conflict("You cannot have more than " + COLLECTIONS_PER_USER_MAX + " collections.");
    }
    if (existsCollectionName(userId, dto.name)) throw conflict("A collection named \"" + dto.name + "\" already exists.");
    var collection = { id: nextId("collections"), userId: userId, name: dto.name, createdAt: toSeconds(Date.now()) };
    state.collections.push(collection);
    return { id: collection.id, kind: "custom", name: collection.name, beerCount: 0 };
  };
  var renameCollection = function (userId, id, dto) {
    getOwnedCollection(userId, id);
    if (existsCollectionName(userId, dto.name, id)) throw conflict("A collection named \"" + dto.name + "\" already exists.");
    state.collections.find(function (c) { return c.id === id; }).name = dto.name;
    return getOwnedCollection(userId, id);
  };
  var deleteCollection = function (userId, id) {
    getOwnedCollection(userId, id);
    state.collectionItems = state.collectionItems.filter(function (i) { return i.collectionId !== id; });
    state.collections = state.collections.filter(function (c) { return c.id !== id; });
  };
  var addCollectionBeer = function (userId, collectionId, dto) {
    var summary = getOwnedCollection(userId, collectionId);
    getBeer(dto.beerId);
    var items = state.collectionItems.filter(function (i) { return i.collectionId === collectionId; });
    if (items.some(function (i) { return i.beerId === dto.beerId; })) {
      throw conflict("Beer " + dto.beerId + " is already in this collection.");
    }
    if (items.length >= COLLECTION_BEERS_MAX) {
      throw conflict("A collection cannot hold more than " + COLLECTION_BEERS_MAX + " beers.");
    }
    state.collectionItems.push({ id: nextId("collectionItems"), collectionId: collectionId, beerId: dto.beerId,
      addedAt: toSeconds(Date.now()) });
    return Object.assign({}, summary, { beerCount: items.length + 1 });
  };
  var removeCollectionBeer = function (userId, collectionId, beerId) {
    getOwnedCollection(userId, collectionId);
    var i = state.collectionItems.findIndex(function (it) { return it.collectionId === collectionId && it.beerId === beerId; });
    if (i === -1) throw notFound("Beer " + beerId + " is not in collection " + collectionId + ".");
    state.collectionItems.splice(i, 1);
  };
  var getMyCollections = function (userId, beerId) {
    if (beerId !== undefined) getBeer(beerId);
    var inWishlist = beerId === undefined ? false : getBeerStates(userId, [beerId])[0].inWishlist;
    var containing = beerId === undefined ? [] : state.collections.filter(function (c) {
      return c.userId === userId && state.collectionItems.some(function (i) { return i.collectionId === c.id && i.beerId === beerId; });
    }).map(function (c) { return c.id; });
    return [Object.assign(wishlistSummary(getWishlistBeerIds(userId).length), { containsBeer: inWishlist })]
      .concat(collectionSummaries(function (c) { return c.userId === userId; }).map(function (c) {
        return Object.assign(c, { containsBeer: c.id !== null && containing.indexOf(c.id) !== -1 });
      }));
  };

  // ---------------------------------------------------------------- routes (contrôleurs)
  var routes = [];
  var route = function (method, path, spec) {
    var names = [];
    var pattern = path.replace(/:(\w+)/g, function (_, name) { names.push(name); return "([^/]+)"; });
    routes.push(Object.assign({ method: method, regex: new RegExp("^" + API_PREFIX + pattern + "/?$", "i"), names: names }, spec));
  };
  var int = function (name) { return { name: name, pipe: parseIntParam }; };

  route("GET", "/beers", { query: BeersQuerySchema, run: function (r) { return getBeers(r.userId, r.query); } });
  route("POST", "/beers", { status: 201, body: CreateBeerSchema, run: function (r) { return createBeer(r.userId, r.body); } });
  route("GET", "/beer-styles", { run: function () { return getStyleGroups(); } });
  route("GET", "/breweries", { run: function () { return getBreweries(); } });
  route("GET", "/beers/:id", { params: [int("id")], run: function (r) { return getBeerForUser(r.userId, r.params.id); } });
  route("GET", "/beers/:beerId/reviews", { params: [int("beerId")], query: PageQuerySchema,
    run: function (r) { return getReviewPage(r.userId, r.params.beerId, r.query); } });
  route("PUT", "/beers/:beerId/reviews/me", { params: [int("beerId")], body: UpsertReviewSchema,
    run: function (r) { return saveMyReview(r.userId, r.params.beerId, r.body); } });
  route("DELETE", "/beers/:beerId/reviews/me", { params: [int("beerId")], status: 204,
    run: function (r) { deleteMyReview(r.userId, r.params.beerId); } });
  route("GET", "/beers/:beerId/venues", { params: [int("beerId")], query: PositionQuerySchema,
    run: function (r) { return getBeerVenues(r.params.beerId, r.query); } });
  route("POST", "/checkins", { status: 201, multipart: true, body: CreateCheckinSchema,
    run: function (r) { return createCheckin(r.userId, r.body, r.file); } });
  route("GET", "/checkins", { query: CheckinsQuerySchema, run: function (r) { return getCheckins(r.userId, r.query); } });
  route("GET", "/checkins/:id", { params: [int("id")], run: function (r) { return getCheckin(r.userId, r.params.id); } });
  route("PATCH", "/checkins/:id", { params: [int("id")], body: UpdateCheckinSchema,
    run: function (r) { return updateCheckin(r.userId, r.params.id, r.body); } });
  route("DELETE", "/checkins/:id", { params: [int("id")], status: 204, run: function (r) { deleteCheckin(r.userId, r.params.id); } });
  route("GET", "/me/dex", { run: function (r) { return getDex(r.userId); } });
  route("GET", "/me/wishlist", { run: function (r) { return getWishlist(r.userId); } });
  route("POST", "/me/wishlist", { status: 201, body: BeerIdBodySchema, run: function (r) { return addToWishlist(r.userId, r.body); } });
  route("DELETE", "/me/wishlist/:beerId", { params: [int("beerId")], status: 204,
    run: function (r) { removeFromWishlist(r.userId, r.params.beerId); } });
  route("GET", "/venues", { query: VenuesQuerySchema, run: function (r) { return getVenues(r.userId, r.query); } });
  route("GET", "/venues/:id", { params: [int("id")], run: function (r) { return getVenue(r.userId, r.params.id); } });
  route("GET", "/venues/:id/beers", { params: [int("id")], query: VenueBeersQuerySchema,
    run: function (r) { return getVenueBeers(r.userId, r.params.id, r.query); } });
  route("POST", "/venues", { status: 201, body: CreateVenueSchema, run: function (r) { return createVenue(r.body); } });
  route("POST", "/venues/:id/beers", { status: 201, params: [int("id")], body: BeerIdBodySchema,
    run: function (r) { return reportBeer(r.userId, r.params.id, r.body); } });
  route("POST", "/venues/:id/beers/:beerId/votes", { status: 201, params: [int("id"), int("beerId")], body: CreateVoteSchema,
    run: function (r) { return vote(r.userId, r.params.id, r.params.beerId, r.body); } });
  route("GET", "/me/stats", { run: function (r) { return getStats(r.userId); } });
  route("GET", "/me/badges", { run: function (r) { return getBadges(r.userId); } });
  route("GET", "/me/feed", { query: PageQuerySchema, run: function (r) { return getFeed(r.userId, r.query); } });
  route("GET", "/users", { run: function (r) { return toSummaries(r.userId, getUsers()); } });
  route("GET", "/users/:userId/profile", { params: [int("userId")], run: function (r) { return getProfile(r.userId, r.params.userId); } });
  route("GET", "/users/:userId/followers", { params: [int("userId")], run: function (r) {
    getUser(r.params.userId);
    return toSummaries(r.userId, usersAmong(followerIdsOf(r.params.userId)));
  } });
  route("GET", "/users/:userId/following", { params: [int("userId")], run: function (r) {
    getUser(r.params.userId);
    return toSummaries(r.userId, usersAmong(followingIdsOf(r.params.userId)));
  } });
  route("POST", "/users/:userId/follow", { status: 201, params: [int("userId")],
    run: function (r) { return follow(r.userId, r.params.userId); } });
  route("DELETE", "/users/:userId/follow", { status: 204, params: [int("userId")],
    run: function (r) { unfollow(r.userId, r.params.userId); } });
  route("PUT", "/me/profile", { body: UpdateProfileSchema, run: function (r) { return updateMyProfile(r.userId, r.body); } });
  route("GET", "/me/collections", { query: MyCollectionsQuerySchema, run: function (r) { return getMyCollections(r.userId, r.query.beerId); } });
  route("POST", "/me/collections", { status: 201, body: SaveCollectionSchema, run: function (r) { return createCollection(r.userId, r.body); } });
  route("PATCH", "/me/collections/:collectionId", { params: [int("collectionId")], body: SaveCollectionSchema,
    run: function (r) { return renameCollection(r.userId, r.params.collectionId, r.body); } });
  route("DELETE", "/me/collections/:collectionId", { status: 204, params: [int("collectionId")],
    run: function (r) { deleteCollection(r.userId, r.params.collectionId); } });
  route("POST", "/me/collections/:collectionId/beers", { status: 201, params: [int("collectionId")], body: BeerIdBodySchema,
    run: function (r) { return addCollectionBeer(r.userId, r.params.collectionId, r.body); } });
  route("DELETE", "/me/collections/:collectionId/beers/:beerId", { status: 204, params: [int("collectionId"), int("beerId")],
    run: function (r) { removeCollectionBeer(r.userId, r.params.collectionId, r.params.beerId); } });
  route("GET", "/users/:userId/collections", { params: [int("userId")],
    run: function (r) { return getUserCollections(r.userId, r.params.userId); } });
  route("GET", "/users/:userId/collections/:collectionId", { params: [int("userId"), int("collectionId")],
    run: function (r) { return getCollectionDetail(r.userId, r.params.userId, r.params.collectionId); } });
  route("GET", "/users/:userId/wishlist", { params: [int("userId")],
    run: function (r) { return getWishlistDetail(r.userId, r.params.userId); } });

  // ---------------------------------------------------------------- serveur HTTP simulé
  var STATUS_TEXT = { 200: "OK", 201: "Created", 204: "No Content", 400: "Bad Request", 401: "Unauthorized",
    403: "Forbidden", 404: "Not Found", 409: "Conflict", 413: "Payload Too Large", 429: "Too Many Requests", 500: "Internal Server Error" };
  var jsonResponse = function (status, body) {
    if (status === 204) return new Response(null, { status: 204, statusText: STATUS_TEXT[204] });
    return new Response(JSON.stringify(body), { status: status, statusText: STATUS_TEXT[status] || "",
      headers: { "Content-Type": "application/json; charset=utf-8" } });
  };
  var parseQuery = function (search) {
    var query = {};
    new URLSearchParams(search).forEach(function (value, key) {
      if (Object.prototype.hasOwnProperty.call(query, key)) {
        query[key] = Array.isArray(query[key]) ? query[key].concat([value]) : [query[key], value];
      } else query[key] = value;
    });
    return query;
  };
  var readUserId = function (raw) {
    if (typeof raw !== "string" || !/^\d+$/.test(raw.trim())) return null;
    var id = Number(raw.trim());
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  };
  var isBlob = function (value) { return typeof Blob !== "undefined" && value instanceof Blob; };
  var readMultipart = async function (formData) {
    var body = {};
    var files = [];
    formData.forEach(function (value, key) {
      if (isBlob(value)) files.push({ key: key, value: value });
      else if (Object.prototype.hasOwnProperty.call(body, key)) {
        body[key] = Array.isArray(body[key]) ? body[key].concat([value]) : [body[key], value];
      } else body[key] = value;
    });
    var file;
    for (var i = 0; i < files.length; i += 1) {
      if (files[i].key !== "file") throw badRequest("Unexpected file field - " + files[i].key);
      if (file !== undefined) throw badRequest("Too many files");
      if (files[i].value.size > UPLOAD_MAX_SIZE_BYTES) throw new HttpError(413, "File too large");
      file = { bytes: new Uint8Array(await files[i].value.arrayBuffer()) };
    }
    return { body: body, file: file };
  };
  var readJsonBody = function (body) {
    if (body === undefined || body === null || body === "") return {};
    if (typeof body === "string") {
      try { return JSON.parse(body); } catch (e) { throw badRequest("Unexpected token in JSON"); }
    }
    return body;
  };

  var dispatch = async function (method, url, headers, rawBody) {
    var parsed = new URL(url);
    var pathname = parsed.pathname;
    var match = null;
    var found = null;
    for (var i = 0; i < routes.length && found === null; i += 1) {
      if (routes[i].method !== method) continue;
      match = routes[i].regex.exec(pathname);
      if (match) found = routes[i];
    }
    if (found === null) throw notFound("Cannot " + method + " " + url.slice(BASE_ORIGIN.length));
    var userId = readUserId(headers.get("X-User-Id"));
    if (userId === null || !index.usersById.has(userId)) throw new HttpError(401, UNIDENTIFIED_USER_MESSAGE);
    var request = { userId: userId, params: {}, query: {}, body: {} };
    var plainBody;
    if (found.multipart && typeof FormData !== "undefined" && rawBody instanceof FormData) {
      var multipart = await readMultipart(rawBody);
      plainBody = multipart.body;
      request.file = multipart.file;
    } else if (found.body) {
      plainBody = readJsonBody(rawBody);
    }
    found.names.forEach(function (name, idx) {
      var spec = (found.params || []).find(function (p) { return p.name === name; });
      var value = decodeURIComponent(match[idx + 1]);
      request.params[name] = spec ? spec.pipe(value) : value;
    });
    // Sans @Query() dans le contrôleur, Nest ne valide pas la chaîne de requête : les paramètres inconnus sont ignorés.
    request.query = found.query ? validate(found.query, parseQuery(parsed.search)) : {};
    if (found.body) request.body = validate(found.body, plainBody);
    var result = found.run(request);
    return { status: found.status || 200, body: result, mutating: method !== "GET" };
  };

  var delay = function (signal) {
    var min = LATENCY[0];
    var max = LATENCY[1];
    var ms = min + Math.random() * Math.max(0, max - min);
    return new Promise(function (resolve, reject) {
      if (signal && signal.aborted) { reject(abortError(signal)); return; }
      var timer = setTimeout(function () {
        if (signal) signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      var onAbort = function () { clearTimeout(timer); reject(abortError(signal)); };
      if (signal) signal.addEventListener("abort", onAbort, { once: true });
    });
  };
  var abortError = function (signal) {
    if (signal && signal.reason !== undefined) return signal.reason;
    try { return new DOMException("The operation was aborted.", "AbortError"); } catch (e) { return new Error("AbortError"); }
  };

  var handle = async function (input, init) {
    var isRequest = typeof Request !== "undefined" && input instanceof Request;
    var url = isRequest ? input.url : String(input);
    var opts = init || {};
    var method = String(opts.method || (isRequest ? input.method : "GET")).toUpperCase();
    var headers = new Headers(opts.headers || (isRequest ? input.headers : undefined));
    var signal = opts.signal || (isRequest ? input.signal : undefined);
    var rawBody = opts.body;
    if (rawBody === undefined && isRequest && method !== "GET" && method !== "HEAD") {
      var type = input.headers.get("Content-Type") || "";
      rawBody = type.indexOf("multipart/form-data") !== -1 ? await input.formData() : await input.text();
    }
    await delay(signal);
    try {
      var out = await dispatch(method, url, headers, rawBody);
      if (out.mutating) saveState();
      return jsonResponse(out.status, out.body);
    } catch (error) {
      if (error instanceof HttpError) return jsonResponse(error.status, { message: error.message });
      if (typeof console !== "undefined") console.error("[mousse-mock] erreur interne", error);
      return jsonResponse(500, { message: "Internal error" });
    }
  };

  var realFetch = typeof root.fetch === "function" ? root.fetch.bind(root) : null;
  var isMockUrl = function (url) {
    return url === BASE_URL || url.indexOf(BASE_URL + "/") === 0 || url.indexOf(BASE_URL + "?") === 0;
  };
  root.fetch = function (input, init) {
    var url = typeof input === "string" ? input : input instanceof URL ? input.href : input && input.url;
    if (typeof url === "string" && isMockUrl(url)) return handle(input, init);
    if (realFetch === null) return Promise.reject(new TypeError("fetch indisponible"));
    return realFetch(input, init);
  };
})();
