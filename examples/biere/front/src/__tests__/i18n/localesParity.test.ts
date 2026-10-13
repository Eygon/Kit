import en from "@/i18n/locales/en.json";
import fr from "@/i18n/locales/fr.json";
import { getDeepKeys } from "@/__tests__/utils/getDeepKeys";

const readKey = (locale: unknown, path: string) =>
  path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], locale);

describe("locales parity", () => {
  it("exposes the same deep keys in en as in fr", () => {
    expect(getDeepKeys(en).sort()).toEqual(getDeepKeys(fr).sort());
  });

  it("has no empty translation in any locale", () => {
    [fr, en].forEach((locale) => {
      getDeepKeys(locale).forEach((key) => expect(readKey(locale, key)).not.toBe(""));
    });
  });

  it("translates the four tab labels in every locale", () => {
    const keys = ["nav.encyclopedia", "nav.map", "nav.journal", "nav.profile"];
    expect(keys.map((key) => readKey(fr, key))).toEqual(["Encyclopédie", "Carte", "Journal", "Profil"]);
    expect(keys.map((key) => readKey(en, key))).toEqual(["Encyclopedia", "Map", "Journal", "Profile"]);
  });
});

describe("encyclopedia catalog copy", () => {
  const keys = [
    "pages.encyclopedia.emptyTitle",
    "pages.encyclopedia.emptyDescription",
    "pages.encyclopedia.errorTitle",
    "pages.encyclopedia.loadMore",
    "common.retry",
  ];

  it("translates the catalog keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Aucune bière ne correspond",
      "Essayez une autre recherche ou retirez des filtres.",
      "Impossible de charger les bières.",
      "Voir plus",
      "Réessayer",
    ]);
  });

  it("translates the catalog keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "No beer matches",
      "Try another search or remove some filters.",
      "Could not load the beers.",
      "Show more",
      "Retry",
    ]);
  });
});

describe("encyclopedia progress copy", () => {
  const keys = [
    "pages.encyclopedia.progress.label",
    "pages.encyclopedia.progress.ringLabel",
    "pages.encyclopedia.progress.errorTitle",
  ];

  it("translates the progress keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "{{discovered}} / {{total}} découvertes",
      "Progression du Pokédex",
      "Progression indisponible.",
    ]);
  });

  it("translates the progress keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "{{discovered}} / {{total}} discovered",
      "Pokédex progress",
      "Progress unavailable.",
    ]);
  });

  it("no longer carries the beer count subtitle keys", () => {
    [fr, en].forEach((locale) => {
      expect(getDeepKeys(locale)).not.toContain("pages.encyclopedia.count_one");
      expect(getDeepKeys(locale)).not.toContain("pages.encyclopedia.count_other");
    });
  });
});

describe("encyclopedia search and family copy", () => {
  const keys = [
    "pages.encyclopedia.search.label",
    "pages.encyclopedia.search.clear",
    "pages.encyclopedia.resultCount_one",
    "pages.encyclopedia.resultCount_other",
    "pages.encyclopedia.families.label",
    "pages.encyclopedia.families.all",
    "pages.encyclopedia.families.chip",
  ];

  it("translates the search and family keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Rechercher une bière ou une brasserie",
      "Effacer la recherche",
      "{{count}} résultat",
      "{{count}} résultats",
      "Familles",
      "Toutes",
      "{{label}} ({{count}})",
    ]);
  });

  it("translates the search and family keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Search a beer or a brewery",
      "Clear search",
      "{{count}} result",
      "{{count}} results",
      "Families",
      "All",
      "{{label}} ({{count}})",
    ]);
  });

  it("labels the eighteen beer families in both languages", () => {
    const familyKeys = getDeepKeys(fr).filter((key) => key.startsWith("beer.families."));
    expect(familyKeys).toHaveLength(18);
    familyKeys.forEach((key) => {
      expect(readKey(fr, key)).toEqual(expect.any(String));
      expect(readKey(en, key)).toEqual(expect.any(String));
    });
    expect(readKey(fr, "beer.families.trappist")).toBe("Trappiste");
    expect(readKey(fr, "beer.families.nonAlcoholic")).toBe("Sans alcool");
    expect(readKey(en, "beer.families.trappist")).toBe("Trappist");
    expect(readKey(en, "beer.families.nonAlcoholic")).toBe("Non-alcoholic");
    expect(readKey(en, "beer.families.belgianStrong")).toBe("Belgian Strong");
    expect(readKey(en, "beer.families.fruit")).toBe("Fruit beer");
  });
});

describe("encyclopedia filters drawer copy", () => {
  const keys = [
    "pages.encyclopedia.filters.title",
    "pages.encyclopedia.filters.activeCount_one",
    "pages.encyclopedia.filters.activeCount_other",
    "pages.encyclopedia.filters.abv",
    "pages.encyclopedia.filters.abvRange",
    "pages.encyclopedia.filters.countries",
    "pages.encyclopedia.filters.formats",
    "pages.encyclopedia.filters.sort",
    "pages.encyclopedia.filters.reset",
    "pages.encyclopedia.filters.apply_one",
    "pages.encyclopedia.filters.apply_other",
    "pages.encyclopedia.filters.applyUnknown",
    "pages.encyclopedia.filters.facetOption",
    "beer.formats.bottle",
    "beer.formats.can",
    "beer.formats.draft",
    "beer.sorts.name",
    "beer.sorts.abv",
    "beer.sorts.brewery",
  ];

  it("translates the filters drawer keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Filtres",
      "{{count}} filtre actif",
      "{{count}} filtres actifs",
      "Degré",
      "{{min}} à {{max}} %",
      "Pays",
      "Format",
      "Trier par",
      "Réinitialiser",
      "Voir {{count}} bière",
      "Voir {{count}} bières",
      "Voir les bières",
      "{{label}} ({{count}})",
      "Bouteille",
      "Canette",
      "Pression",
      "Nom",
      "Degré",
      "Brasserie",
    ]);
  });

  it("translates the filters drawer keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Filters",
      "{{count}} active filter",
      "{{count}} active filters",
      "Strength (ABV)",
      "{{min}} to {{max}}%",
      "Countries",
      "Format",
      "Sort by",
      "Reset",
      "Show {{count}} beer",
      "Show {{count}} beers",
      "Show beers",
      "{{label}} ({{count}})",
      "Bottle",
      "Can",
      "Draft",
      "Name",
      "Strength",
      "Brewery",
    ]);
  });
});

describe("beer detail copy", () => {
  const keys = [
    "pages.beerDetail.back",
    "pages.beerDetail.brewery",
    "pages.beerDetail.country",
    "pages.beerDetail.style",
    "pages.beerDetail.abv",
    "pages.beerDetail.aromas",
    "pages.beerDetail.formats",
    "pages.beerDetail.description",
    "pages.beerDetail.unknownTitle",
    "pages.beerDetail.unknownDescription",
    "pages.beerDetail.backToEncyclopedia",
    "pages.beerDetail.errorTitle",
  ];

  it("translates the beer detail keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Retour",
      "Brasserie",
      "Pays",
      "Style",
      "Degré",
      "Arômes",
      "Formats",
      "Description",
      "Bière inconnue",
      "Cette bière n'est pas dans l'encyclopédie.",
      "Retour à l'Encyclopédie",
      "Impossible de charger cette bière.",
    ]);
  });

  it("translates the beer detail keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Back",
      "Brewery",
      "Country",
      "Style",
      "Strength",
      "Aromas",
      "Formats",
      "Description",
      "Unknown beer",
      "This beer is not in the encyclopedia.",
      "Back to the encyclopedia",
      "Could not load this beer.",
    ]);
  });

  it("translates the eighteen aromas in French and English", () => {
    const aromaKeys = Object.keys(en.beer.aromas);

    expect(aromaKeys).toHaveLength(18);
    expect(aromaKeys.map((key) => readKey(fr, `beer.aromas.${key}`))).toEqual([
      "Fruité", "Agrumes", "Houblonné", "Floral", "Épicé", "Caramel", "Malté", "Torréfié", "Café", "Chocolat", "Miel", "Banane",
      "Clou de girofle", "Acidulé", "Boisé", "Herbacé", "Fumé", "Biscuit",
    ]);
    expect(aromaKeys.map((key) => readKey(en, `beer.aromas.${key}`))).toEqual([
      "Fruity", "Citrus", "Hoppy", "Floral", "Spicy", "Caramel", "Malty", "Roasted", "Coffee", "Chocolate", "Honey", "Banana",
      "Clove", "Sour", "Woody", "Herbal", "Smoky", "Biscuit",
    ]);
  });
});

describe("tasting card and status filter copy", () => {
  const expected: [string, string, string][] = [
    ["pages.encyclopedia.card.unknownLabel", "???", "???"],
    ["pages.encyclopedia.card.notTasted", "Pas encore goûtée", "Not tasted yet"],
    ["pages.encyclopedia.card.stamp", "Bue le {{date}}", "Tasted on {{date}}"],
    ["pages.encyclopedia.card.stampWithoutDate", "Bue", "Tasted"],
    ["pages.encyclopedia.filters.status", "Statut", "Status"],
    ["pages.encyclopedia.filters.allStatuses", "Toutes", "All"],
    ["beer.statuses.drunk", "Bues", "Tasted"],
    ["beer.statuses.wishlist", "À goûter", "To taste"],
    ["beer.statuses.untasted", "Jamais goûtées", "Never tasted"],
  ];

  it.each(expected)("translates %s in French and in English", (key, french, english) => {
    expect(readKey(fr, key)).toBe(french);
    expect(readKey(en, key)).toBe(english);
  });
});

describe("wishlist toggle copy", () => {
  const expected: [string, string, string][] = [
    ["pages.beerDetail.wishlist.toggle", "À goûter", "To taste"],
    ["pages.beerDetail.wishlist.added", "Ajoutée à vos envies.", "Added to your wishlist."],
    ["pages.beerDetail.wishlist.removed", "Retirée de vos envies.", "Removed from your wishlist."],
  ];

  it.each(expected)("translates %s in French and in English", (key, french, english) => {
    expect(readKey(fr, key)).toBe(french);
    expect(readKey(en, key)).toBe(english);
  });
});

describe("checkin history copy", () => {
  const expected: [string, string, string][] = [
    ["pages.beerDetail.history.title", "Mon historique", "My history"],
    [
      "pages.beerDetail.history.empty",
      "Pas encore de dégustation : appuyez sur « Je l'ai bue ».",
      "No tasting yet: tap “I drank it”.",
    ],
    [
      "pages.beerDetail.history.errorTitle",
      "Impossible de charger votre historique.",
      "Could not load your history.",
    ],
    ["pages.beerDetail.history.loadMore", "Voir plus", "Show more"],
    ["pages.beerDetail.history.rating", "★ {{rating}}", "★ {{rating}}"],
    ["pages.beerDetail.history.ratingLabel", "Note : {{rating}} sur 5", "Rating: {{rating}} out of 5"],
  ];

  it.each(expected)("translates %s in French and in English", (key, french, english) => {
    expect(readKey(fr, key)).toBe(french);
    expect(readKey(en, key)).toBe(english);
  });
});

describe("checkin sheet copy", () => {
  const expected: [string, string, string][] = [
    ["common.close", "Fermer", "Close"],
    ["pages.beerDetail.checkin.open", "Je l'ai bue", "I drank it"],
    ["pages.beerDetail.checkin.title", "Je l'ai bue : {{name}}", "I drank it: {{name}}"],
    ["pages.beerDetail.checkin.drankAt", "Date et heure", "Date and time"],
    ["pages.beerDetail.checkin.drankAtRequired", "Indiquez la date et l'heure.", "Enter the date and time."],
    [
      "pages.beerDetail.checkin.drankAtFuture",
      "La date ne peut pas être dans le futur.",
      "The date cannot be in the future.",
    ],
    ["pages.beerDetail.checkin.place", "Lieu", "Place"],
    ["pages.beerDetail.checkin.placeRequired", "Indiquez le lieu.", "Enter the place."],
    ["pages.beerDetail.checkin.rating", "Note", "Rating"],
    ["pages.beerDetail.checkin.noRating", "Sans note", "No rating"],
    ["pages.beerDetail.checkin.ratingValue", "{{rating}} / 5", "{{rating}} / 5"],
    ["pages.beerDetail.checkin.aromas", "Arômes ressentis (5 au plus)", "Aromas (up to 5)"],
    ["pages.beerDetail.checkin.format", "Format", "Format"],
    ["pages.beerDetail.checkin.formatRequired", "Choisissez un format.", "Choose a format."],
    ["pages.beerDetail.checkin.price", "Prix", "Price"],
    ["pages.beerDetail.checkin.comment", "Commentaire", "Comment"],
    ["pages.beerDetail.checkin.commentCount", "{{count}} / 500", "{{count}} / 500"],
    ["pages.beerDetail.checkin.submit", "Enregistrer", "Save"],
    ["pages.beerDetail.checkin.saved", "Dégustation enregistrée.", "Tasting saved."],
    ["pages.beerDetail.checkin.capturedTitle", "Nouvelle bière capturée !", "New beer captured!"],
    ["pages.beerDetail.checkin.capturedDescription", "{{name}} rejoint votre Pokédex.", "{{name}} joins your Pokédex."],
  ];

  it.each(expected)("translates %s in French and in English", (key, french, english) => {
    expect(readKey(fr, key)).toBe(french);
    expect(readKey(en, key)).toBe(english);
  });
});

describe("map venue list copy", () => {
  const keys = [
    "pages.map.list.trigger",
    "pages.map.list.title",
    "pages.map.list.errorTitle",
    "pages.map.list.emptyTitle",
    "pages.map.list.emptyDescription",
    "venue.types.bar",
    "venue.types.shop",
    "venue.types.brewery",
    "venue.statuses.confirmed",
    "venue.statuses.maybeGone",
    "venue.statuses.gone",
    "venue.statuses.unknown",
  ];

  it("translates the venue list keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Lieux ({{count}})",
      "Lieux",
      "Impossible de charger les lieux.",
      "Aucun lieu ici",
      "Déplacez la carte ou retirez des filtres.",
      "Bar",
      "Cave",
      "Brasserie",
      "Confirmée",
      "Peut-être épuisée",
      "Épuisée",
      "Inconnue",
    ]);
  });

  it("translates the venue list keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Places ({{count}})",
      "Places",
      "Could not load the places.",
      "No place here",
      "Move the map or remove some filters.",
      "Bar",
      "Shop",
      "Brewery",
      "Confirmed",
      "Maybe gone",
      "Gone",
      "Unknown",
    ]);
  });

  it("drops the fixed map empty state copy that the venue list replaces", () => {
    [fr, en].forEach((locale) => {
      expect(readKey(locale, "pages.map.emptyTitle")).toBeUndefined();
      expect(readKey(locale, "pages.map.emptyDescription")).toBeUndefined();
    });
  });
});

describe("map availability copy", () => {
  const keys = ["pages.map.title", "pages.map.markerLabel", "pages.map.tilesUnavailable"];

  it("translates the map keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Carte",
      "{{name}}, {{type}}, {{status}}",
      "Fond de carte indisponible : les lieux restent utilisables.",
    ]);
  });

  it("translates the map keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Map",
      "{{name}}, {{type}}, {{status}}",
      "Map background unavailable: places still work.",
    ]);
  });
});

describe("map location copy", () => {
  const keys = [
    "pages.map.locate.action",
    "pages.map.locate.denied",
    "pages.map.locate.unavailable",
    "pages.map.youAreHere",
  ];

  it("translates the location keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Autour de moi",
      "Position refusée : autorisez la localisation dans les réglages du navigateur.",
      "Position indisponible.",
      "Vous êtes ici",
    ]);
  });

  it("translates the location keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Near me",
      "Location denied: allow it in your browser settings.",
      "Location unavailable.",
      "You are here",
    ]);
  });
});

describe("map filters copy", () => {
  const keys = [
    "pages.map.filters.title",
    "pages.map.filters.types",
    "pages.map.filters.family",
    "pages.map.filters.anyFamily",
    "pages.map.filters.confirmedOnly",
    "pages.map.filters.radius",
    "pages.map.filters.radiusOption",
    "pages.map.filters.radiusNeedsPosition",
    "pages.map.filters.legend",
    "pages.map.filters.activeCount_one",
    "pages.map.filters.activeCount_other",
    "pages.map.filters.reset",
    "pages.map.filters.apply",
  ];

  it("translates the filters keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Filtres",
      "Type de lieu",
      "Famille de bière",
      "Toutes",
      "Disponibilité confirmée seulement",
      "Rayon",
      "{{count}} km",
      "Utilisez Autour de moi pour choisir un rayon.",
      "Légende",
      "{{count}} filtre actif",
      "{{count}} filtres actifs",
      "Réinitialiser",
      "Appliquer",
    ]);
  });

  it("translates the filters keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Filters",
      "Place type",
      "Beer family",
      "All",
      "Confirmed availability only",
      "Radius",
      "{{count}} km",
      "Use Near me to pick a radius.",
      "Legend",
      "{{count}} active filter",
      "{{count}} active filters",
      "Reset",
      "Apply",
    ]);
  });
});

describe("map venue sheet copy", () => {
  const keys = ["pages.map.venue.address", "pages.map.venue.city", "pages.map.venue.close"];

  it("translates the venue sheet keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual(["Adresse", "Ville", "Fermer"]);
  });

  it("translates the venue sheet keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual(["Address", "City", "Close"]);
  });
});

describe("map venue beers copy", () => {
  const keys = [
    "pages.map.venueBeers.title",
    "pages.map.venueBeers.otherFamily",
    "pages.map.venueBeers.errorTitle",
    "pages.map.venueBeers.emptyTitle",
    "pages.map.venueBeers.emptyDescription",
  ];

  it("translates the venue beers keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Bières",
      "Autres",
      "Impossible de charger les bières.",
      "Aucune bière signalée ici",
      "Soyez le premier à en signaler une.",
    ]);
  });

  it("translates the venue beers keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Beers",
      "Others",
      "Could not load the beers.",
      "No beer reported here",
      "Be the first to report one.",
    ]);
  });
});

describe("vote and availability detail copy", () => {
  const keys = [
    "pages.map.vote.still",
    "pages.map.vote.gone",
    "pages.map.vote.stillLabel",
    "pages.map.vote.goneLabel",
    "pages.map.vote.cooldown",
    "pages.map.vote.saved",
    "pages.map.vote.alreadyVoted",
    "venue.detail.neverConfirmed",
    "venue.detail.neverConfirmedWithVoters_one",
    "venue.detail.neverConfirmedWithVoters_other",
    "venue.detail.confirmedToday",
    "venue.detail.confirmedDaysAgo_one",
    "venue.detail.confirmedDaysAgo_other",
    "venue.detail.voters_one",
    "venue.detail.voters_other",
  ];

  it("translates the vote and detail keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Toujours là",
      "Plus là",
      "Toujours là : {{beer}}",
      "Plus là : {{beer}}",
      "Vous pourrez revoter dans {{count}} h",
      "Vote enregistré",
      "Vous avez déjà voté pour cette bière ici dans les dernières 24 h.",
      "Jamais confirmée",
      "Jamais confirmée · {{count}} personne récemment",
      "Jamais confirmée · {{count}} personnes récemment",
      "Confirmée aujourd'hui par $t(venue.detail.voters, {\"count\": {{voters}} })",
      "Confirmée il y a {{count}} jour par $t(venue.detail.voters, {\"count\": {{voters}} })",
      "Confirmée il y a {{count}} jours par $t(venue.detail.voters, {\"count\": {{voters}} })",
      "{{count}} personne",
      "{{count}} personnes",
    ]);
  });

  it("translates the vote and detail keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Still there",
      "Gone",
      "Still there: {{beer}}",
      "Gone: {{beer}}",
      "You can vote again in {{count}} h",
      "Vote saved",
      "You already voted for this beer here in the last 24 hours.",
      "Never confirmed",
      "Never confirmed · {{count}} person recently",
      "Never confirmed · {{count}} people recently",
      "Confirmed today by $t(venue.detail.voters, {\"count\": {{voters}} })",
      "Confirmed {{count}} day ago by $t(venue.detail.voters, {\"count\": {{voters}} })",
      "Confirmed {{count}} days ago by $t(venue.detail.voters, {\"count\": {{voters}} })",
      "{{count}} person",
      "{{count}} people",
    ]);
  });
});
