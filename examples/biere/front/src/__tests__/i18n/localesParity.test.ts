import en from "@/i18n/locales/en.json";
import fr from "@/i18n/locales/fr.json";
import { getDeepKeys } from "@/__tests__/utils/getDeepKeys";

const readKey = (locale: unknown, path: string) =>
  path
    .split(".")
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)[part],
      locale,
    );

describe("locales parity", () => {
  it("exposes the same deep keys in en as in fr", () => {
    expect(getDeepKeys(en).sort()).toEqual(getDeepKeys(fr).sort());
  });

  it("translates the locked collections invitation with the name in every locale", () => {
    expect(readKey(fr, "collections.locked")).toBe("Suivez {{name}} pour voir ses collections");
    expect(readKey(en, "collections.locked")).toBe("Follow {{name}} to see their collections");
  });

  it("translates the remove-beer actions of a collection in every locale", () => {
    expect(readKey(fr, "pages.collection.remove")).toBe("Retirer");
    expect(readKey(en, "pages.collection.remove")).toBe("Remove");
    expect(readKey(fr, "pages.collection.removeLabel")).toBe("Retirer {{name}} de la collection");
    expect(readKey(en, "pages.collection.removeLabel")).toBe("Remove {{name}} from the collection");
    expect(readKey(fr, "pages.collection.removeSuccess")).toBe("Bière retirée de la collection");
    expect(readKey(en, "pages.collection.removeSuccess")).toBe("Beer removed from the collection");
  });

  it("translates the cluster label with its count in every locale", () => {
    expect(readKey(fr, "pages.map.clusterLabel_one")).toBe("{{count}} lieu, zoomer");
    expect(readKey(en, "pages.map.clusterLabel_one")).toBe("{{count}} venue, zoom in");
    expect(readKey(fr, "pages.map.clusterLabel_other")).toBe("{{count}} lieux, zoomer");
    expect(readKey(en, "pages.map.clusterLabel_other")).toBe("{{count}} venues, zoom in");
  });

  it("translates the update available prompt and its refresh action in every locale", () => {
    expect(readKey(fr, "pwa.updateAvailable")).toBe("Nouvelle version disponible");
    expect(readKey(en, "pwa.updateAvailable")).toBe("A new version is available");
    expect(readKey(fr, "pwa.refresh")).toBe("Actualiser");
    expect(readKey(en, "pwa.refresh")).toBe("Refresh");
  });

  it("has no empty translation in any locale", () => {
    [fr, en].forEach((locale) => {
      getDeepKeys(locale).forEach((key) =>
        expect(readKey(locale, key)).not.toBe(""),
      );
    });
  });

  it("translates the five tab labels in every locale", () => {
    const keys = ["nav.home", "nav.encyclopedia", "nav.map", "nav.journal", "nav.profile"];
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Accueil",
      "Bières",
      "Carte",
      "Journal",
      "Profil",
    ]);
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Home",
      "Beers",
      "Map",
      "Journal",
      "Profile",
    ]);
  });
});

describe("home page copy", () => {
  const keys = ["pages.home.title", "pages.home.subtitle", "pages.home.findProfiles", "pages.encyclopedia.title"];

  it("translates the home keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Accueil",
      "Les dernières dégustations des profils que vous suivez.",
      "Trouver des profils",
      "Encyclopédie",
    ]);
  });

  it("translates the home keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Home",
      "Latest tastings from the profiles you follow.",
      "Find profiles",
      "Encyclopedia",
    ]);
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
      expect(getDeepKeys(locale)).not.toContain(
        "pages.encyclopedia.count_other",
      );
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
    const familyKeys = getDeepKeys(fr).filter((key) =>
      key.startsWith("beer.families."),
    );
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
    "beer.sorts.rating",
    "pages.encyclopedia.filters.minRating",
    "pages.encyclopedia.filters.minRatingAll",
    "pages.encyclopedia.filters.minRatingOption",
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
      "Mieux notées",
      "Note minimale",
      "Toutes",
      "{{rating}}+",
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
      "Top rated",
      "Minimum rating",
      "All",
      "{{rating}}+",
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
      "Fruité",
      "Agrumes",
      "Houblonné",
      "Floral",
      "Épicé",
      "Caramel",
      "Malté",
      "Torréfié",
      "Café",
      "Chocolat",
      "Miel",
      "Banane",
      "Clou de girofle",
      "Acidulé",
      "Boisé",
      "Herbacé",
      "Fumé",
      "Biscuit",
    ]);
    expect(aromaKeys.map((key) => readKey(en, `beer.aromas.${key}`))).toEqual([
      "Fruity",
      "Citrus",
      "Hoppy",
      "Floral",
      "Spicy",
      "Caramel",
      "Malty",
      "Roasted",
      "Coffee",
      "Chocolate",
      "Honey",
      "Banana",
      "Clove",
      "Sour",
      "Woody",
      "Herbal",
      "Smoky",
      "Biscuit",
    ]);
  });
});

describe("tasting card and status filter copy", () => {
  const expected: [string, string, string][] = [
    ["pages.encyclopedia.card.unknownLabel", "???", "???"],
    [
      "pages.encyclopedia.card.notTasted",
      "Pas encore goûtée",
      "Not tasted yet",
    ],
    ["pages.encyclopedia.card.stamp", "Bue le {{date}}", "Tasted on {{date}}"],
    ["pages.encyclopedia.card.stampWithoutDate", "Bue", "Tasted"],
    ["pages.encyclopedia.filters.status", "Statut", "Status"],
    ["pages.encyclopedia.filters.allStatuses", "Toutes", "All"],
    ["beer.statuses.drunk", "Bues", "Tasted"],
    ["beer.statuses.wishlist", "À goûter", "To taste"],
    ["beer.statuses.untasted", "Jamais goûtées", "Never tasted"],
    ["beer.sorts.rating", "Mieux notées", "Top rated"],
    ["pages.encyclopedia.filters.minRating", "Note minimale", "Minimum rating"],
    ["pages.encyclopedia.filters.minRatingAll", "Toutes", "All"],
    ["pages.encyclopedia.filters.minRatingOption", "{{rating}}+", "{{rating}}+"],
  ];

  it.each(expected)(
    "translates %s in French and in English",
    (key, french, english) => {
      expect(readKey(fr, key)).toBe(french);
      expect(readKey(en, key)).toBe(english);
    },
  );
});

describe("wishlist toggle copy", () => {
  const expected: [string, string, string][] = [
    ["pages.beerDetail.wishlist.toggle", "À goûter", "To taste"],
    [
      "pages.beerDetail.wishlist.added",
      "Ajoutée à vos envies.",
      "Added to your wishlist.",
    ],
    [
      "pages.beerDetail.wishlist.removed",
      "Retirée de vos envies.",
      "Removed from your wishlist.",
    ],
  ];

  it.each(expected)(
    "translates %s in French and in English",
    (key, french, english) => {
      expect(readKey(fr, key)).toBe(french);
      expect(readKey(en, key)).toBe(english);
    },
  );
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
    [
      "pages.beerDetail.history.ratingLabel",
      "Note : {{rating}} sur 5",
      "Rating: {{rating}} out of 5",
    ],
  ];

  it.each(expected)(
    "translates %s in French and in English",
    (key, french, english) => {
      expect(readKey(fr, key)).toBe(french);
      expect(readKey(en, key)).toBe(english);
    },
  );
});

describe("checkin sheet copy", () => {
  const expected: [string, string, string][] = [
    ["common.close", "Fermer", "Close"],
    ["pages.beerDetail.checkin.open", "Je l'ai bue", "I drank it"],
    [
      "pages.beerDetail.checkin.title",
      "Je l'ai bue : {{name}}",
      "I drank it: {{name}}",
    ],
    ["pages.beerDetail.checkin.drankAt", "Date et heure", "Date and time"],
    [
      "pages.beerDetail.checkin.drankAtRequired",
      "Indiquez la date et l'heure.",
      "Enter the date and time.",
    ],
    [
      "pages.beerDetail.checkin.drankAtFuture",
      "La date ne peut pas être dans le futur.",
      "The date cannot be in the future.",
    ],
    ["pages.beerDetail.checkin.place", "Lieu", "Place"],
    [
      "pages.beerDetail.checkin.placeRequired",
      "Indiquez le lieu.",
      "Enter the place.",
    ],
    ["pages.beerDetail.checkin.rating", "Note", "Rating"],
    ["pages.beerDetail.checkin.noRating", "Sans note", "No rating"],
    [
      "pages.beerDetail.checkin.ratingValue",
      "{{rating}} / 5",
      "{{rating}} / 5",
    ],
    [
      "pages.beerDetail.checkin.aromas",
      "Arômes ressentis (5 au plus)",
      "Aromas (up to 5)",
    ],
    ["pages.beerDetail.checkin.format", "Format", "Format"],
    [
      "pages.beerDetail.checkin.formatRequired",
      "Choisissez un format.",
      "Choose a format.",
    ],
    ["pages.beerDetail.checkin.price", "Prix", "Price"],
    ["pages.beerDetail.checkin.comment", "Commentaire", "Comment"],
    [
      "pages.beerDetail.checkin.commentCount",
      "{{count}} / 500",
      "{{count}} / 500",
    ],
    ["pages.beerDetail.checkin.submit", "Enregistrer", "Save"],
    [
      "pages.beerDetail.checkin.saved",
      "Dégustation enregistrée.",
      "Tasting saved.",
    ],
    [
      "pages.beerDetail.checkin.capturedTitle",
      "Nouvelle bière capturée !",
      "New beer captured!",
    ],
    [
      "pages.beerDetail.checkin.capturedDescription",
      "{{name}} rejoint votre Pokédex.",
      "{{name}} joins your Pokédex.",
    ],
  ];

  it.each(expected)(
    "translates %s in French and in English",
    (key, french, english) => {
      expect(readKey(fr, key)).toBe(french);
      expect(readKey(en, key)).toBe(english);
    },
  );
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
  const keys = [
    "pages.map.title",
    "pages.map.markerLabel",
    "pages.map.tilesUnavailable",
  ];

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
    "pages.map.filters.undiscovered",
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
      "Lieux avec des bières à découvrir",
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
      "Places with beers to discover",
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
  const keys = [
    "pages.map.venue.address",
    "pages.map.venue.city",
    "pages.map.venue.close",
  ];

  it("translates the venue sheet keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Adresse",
      "Ville",
      "Fermer",
    ]);
  });

  it("translates the venue sheet keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Address",
      "City",
      "Close",
    ]);
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
      'Confirmée aujourd\'hui par $t(venue.detail.voters, {"count": {{voters}} })',
      'Confirmée il y a {{count}} jour par $t(venue.detail.voters, {"count": {{voters}} })',
      'Confirmée il y a {{count}} jours par $t(venue.detail.voters, {"count": {{voters}} })',
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
      'Confirmed today by $t(venue.detail.voters, {"count": {{voters}} })',
      'Confirmed {{count}} day ago by $t(venue.detail.voters, {"count": {{voters}} })',
      'Confirmed {{count}} days ago by $t(venue.detail.voters, {"count": {{voters}} })',
      "{{count}} person",
      "{{count}} people",
    ]);
  });
});


describe("map report copy", () => {
  const keys = [
    "pages.map.report.action",
    "pages.map.report.title",
    "pages.map.report.searchLabel",
    "pages.map.report.clearLabel",
    "pages.map.report.hint",
    "pages.map.report.noResultTitle",
    "pages.map.report.noResultDescription",
    "pages.map.report.errorTitle",
    "pages.map.report.saved",
    "pages.map.report.alreadyListed",
    "pages.map.report.close",
  ];

  it("translates the report keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Signaler une bière ici",
      "Signaler une bière",
      "Rechercher une bière",
      "Effacer la recherche",
      "Saisissez au moins 2 caractères.",
      "Aucune bière trouvée",
      "Essayez un autre nom.",
      "Impossible de chercher les bières.",
      "Bière signalée",
      "Cette bière est déjà signalée ici",
      "Fermer",
    ]);
  });

  it("translates the report keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Report a beer here",
      "Report a beer",
      "Search for a beer",
      "Clear the search",
      "Type at least 2 characters.",
      "No beer found",
      "Try another name.",
      "Could not search the beers.",
      "Beer reported",
      "This beer is already reported here",
      "Close",
    ]);
  });
});

describe("map propose copy", () => {
  const entries: Readonly<Record<string, readonly [string, string]>> = {
    "pages.map.propose.action": ["Proposer un lieu", "Propose a venue"],
    "pages.map.propose.pickHint": [
      "Touchez la carte pour choisir l'emplacement du lieu.",
      "Tap the map to choose where the venue is.",
    ],
    "pages.map.propose.pickedHint": [
      "Glissez le repère pour ajuster le point, puis confirmez.",
      "Drag the marker to adjust the point, then confirm.",
    ],
    "pages.map.propose.confirmPoint": ["Confirmer le point", "Confirm the point"],
    "pages.map.propose.cancel": ["Annuler", "Cancel"],
    "pages.map.propose.pointMarker": ["Point choisi pour le nouveau lieu", "Chosen point for the new venue"],
    "pages.map.propose.title": ["Proposer un lieu", "Propose a venue"],
    "pages.map.propose.point": ["Point choisi : {{latitude}}, {{longitude}}", "Chosen point: {{latitude}}, {{longitude}}"],
    "pages.map.propose.name": ["Nom du lieu", "Venue name"],
    "pages.map.propose.type": ["Type de lieu", "Venue type"],
    "pages.map.propose.address": ["Adresse", "Address"],
    "pages.map.propose.city": ["Ville", "City"],
    "pages.map.propose.description": ["Description", "Description"],
    "pages.map.propose.nameRequired": ["Le nom est requis", "The name is required"],
    "pages.map.propose.addressRequired": ["L'adresse est requise", "The address is required"],
    "pages.map.propose.nameTaken": ["Ce lieu existe déjà", "This venue already exists"],
    "pages.map.propose.submit": ["Proposer", "Propose"],
    "pages.map.propose.close": ["Fermer", "Close"],
    "pages.map.propose.saved": ["Lieu proposé", "Venue proposed"],
  };

  it("translates the propose keys in French", () => {
    expect(Object.keys(entries).map((key) => readKey(fr, key))).toEqual(Object.values(entries).map(([french]) => french));
  });

  it("translates the propose keys in English", () => {
    expect(Object.keys(entries).map((key) => readKey(en, key))).toEqual(Object.values(entries).map(([, english]) => english));
  });
});

describe("where to drink copy", () => {
  const expected: Record<string, [string, string]> = {
    "pages.beerDetail.whereToDrink.title": ["Où en boire", "Where to drink it"],
    "pages.beerDetail.whereToDrink.emptyTitle": ["Pas encore de lieu connu", "No known place yet"],
    "pages.beerDetail.whereToDrink.errorTitle": ["Impossible de charger les lieux.", "Unable to load the places."],
    "pages.beerDetail.whereToDrink.seeOnMap": ["Voir sur la carte", "See on the map"],
  };

  it("translates the section title, empty title, error title and map link in both locales", () => {
    Object.entries(expected).forEach(([key, [frValue, enValue]]) => {
      expect(readKey(fr, key)).toBe(frValue);
      expect(readKey(en, key)).toBe(enValue);
    });
  });

  it("writes a real description in each locale, not the text of the other", () => {
    const key = "pages.beerDetail.whereToDrink.emptyDescription";
    expect(readKey(fr, key)).toEqual(expect.any(String));
    expect(readKey(en, key)).toEqual(expect.any(String));
    expect(readKey(fr, key)).not.toBe(readKey(en, key));
  });
});

describe("checkin photo copy", () => {
  const keys = [
    "pages.beerDetail.checkin.photo.take",
    "pages.beerDetail.checkin.photo.pick",
    "pages.beerDetail.checkin.photo.remove",
    "pages.beerDetail.checkin.photo.preview",
    "pages.beerDetail.checkin.photo.tooLarge",
    "pages.beerDetail.checkin.photo.badType",
  ];

  it("translates the photo keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Prendre une photo",
      "Choisir dans la galerie",
      "Retirer la photo",
      "Aperçu de la photo",
      "La photo dépasse 5 Mo.",
      "Choisissez une image JPEG, PNG ou WebP.",
    ]);
  });

  it("translates the photo keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Take a photo",
      "Choose from gallery",
      "Remove the photo",
      "Photo preview",
      "The photo is larger than 5 MB.",
      "Choose a JPEG, PNG or WebP image.",
    ]);
  });
});

describe("photo copy", () => {
  it("translates the photo opener and alt text in every locale", () => {
    const keys = ["common.photo.open", "common.photo.alt"];
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Agrandir la photo",
      "Photo de la dégustation",
    ]);
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Enlarge the photo",
      "Tasting photo",
    ]);
  });
});

describe("journal copy", () => {
  it("translates the journal error and load more keys in every locale", () => {
    const keys = ["pages.journal.errorTitle", "pages.journal.loadMore"];
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Impossible de charger le journal.",
      "Voir plus",
    ]);
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Could not load the journal.",
      "Show more",
    ]);
  });
});

describe("journal delete copy", () => {
  const keys = [
    "pages.journal.delete.action",
    "pages.journal.delete.confirmTitle",
    "pages.journal.delete.confirm",
    "pages.journal.delete.cancel",
    "pages.journal.delete.done",
  ];

  it("translates the delete keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Supprimer",
      "Supprimer cette dégustation ?",
      "Supprimer",
      "Annuler",
      "Dégustation supprimée.",
    ]);
  });

  it("translates the delete keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Delete",
      "Delete this tasting?",
      "Delete",
      "Cancel",
      "Tasting deleted.",
    ]);
  });
});


describe("profile language copy", () => {
  const expected: [string, string, string][] = [
    ["pages.profile.language.title", "Langue", "Language"],
    ["pages.profile.language.description", "Choisissez la langue de l'appli.", "Choose the app language."],
    ["pages.profile.language.label", "Langue de l'appli", "App language"],
    ["pages.profile.language.options.fr", "Français", "Français"],
    ["pages.profile.language.options.en", "English", "English"],
  ];

  it.each(expected)("translates %s in French and in English", (key, french, english) => {
    expect(readKey(fr, key)).toBe(french);
    expect(readKey(en, key)).toBe(english);
  });

  it("drops the empty preferences copy that the language selector replaces", () => {
    [fr, en].forEach((locale) => {
      expect(getDeepKeys(locale)).not.toContain("pages.profile.emptyTitle");
      expect(getDeepKeys(locale)).not.toContain("pages.profile.emptyDescription");
    });
  });
});

describe("profile share copy", () => {
  const keys = [
    "pages.profile.share.action",
    "pages.profile.share.text_one",
    "pages.profile.share.text_other",
    "pages.profile.share.copied",
    "pages.profile.share.failed",
  ];

  it("translates the share keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Partager",
      "J'ai découvert {{count}} bière sur Mousse ({{percent}} %)",
      "J'ai découvert {{count}} bières sur Mousse ({{percent}} %)",
      "Copié dans le presse-papiers.",
      "Impossible de partager.",
    ]);
  });

  it("translates the share keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Share",
      "I discovered {{count}} beer on Mousse ({{percent}}%)",
      "I discovered {{count}} beers on Mousse ({{percent}}%)",
      "Copied to the clipboard.",
      "Could not share.",
    ]);
  });
});

describe("beer levels keys", () => {
  const keys = [
    "pages.beerDetail.levels.bitterness",
    "pages.beerDetail.levels.color",
    "pages.beerDetail.levels.notAvailable",
    "pages.beerDetail.levels.score",
    "pages.beerDetail.levels.bitternessValue",
    "pages.beerDetail.levels.styleRange",
    "pages.beerDetail.levels.styleSingle",
    "beer.bitterness.levels.1",
    "beer.bitterness.levels.2",
    "beer.bitterness.levels.3",
    "beer.bitterness.levels.4",
    "beer.bitterness.levels.5",
    "beer.color.levels.1",
    "beer.color.levels.2",
    "beer.color.levels.3",
    "beer.color.levels.4",
    "beer.color.levels.5",
  ];

  it("translates the beer levels keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Amertume",
      "Couleur",
      "Non renseignée",
      "{{level}} / 5",
      "{{label}} · {{score}}",
      "{{min}} à {{max}} · typique du style",
      "{{label}} · typique du style",
      "Très légère",
      "Légère",
      "Modérée",
      "Marquée",
      "Intense",
      "Pâle",
      "Dorée",
      "Ambrée",
      "Brune",
      "Noire",
    ]);
  });

  it("translates the beer levels keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Bitterness",
      "Colour",
      "Not available",
      "{{level}} / 5",
      "{{label}} · {{score}}",
      "{{min}} to {{max}} · typical of the style",
      "{{label}} · typical of the style",
      "Very light",
      "Light",
      "Moderate",
      "Pronounced",
      "Intense",
      "Pale",
      "Golden",
      "Amber",
      "Brown",
      "Black",
    ]);
  });

  it("translates the beer rating keys, with singular and plural, in every locale", () => {
    const keys = [
      "beer.rating.summary",
      "beer.rating.label_one",
      "beer.rating.label_other",
      "beer.rating.none",
    ];
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "{{rating}} ({{count}})",
      "Note moyenne {{rating}} sur 5, {{count}} avis",
      "Note moyenne {{rating}} sur 5, {{count}} avis",
      "Aucun avis",
    ]);
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "{{rating}} ({{count}})",
      "Average rating {{rating}} out of 5, {{count}} review",
      "Average rating {{rating}} out of 5, {{count}} reviews",
      "No reviews",
    ]);
  });
});


describe("profile badges copy", () => {
  const entries: [string, string, string][] = [
    ["pages.profile.badges.title", "Badges", "Badges"],
    ["pages.profile.badges.unlockedOn", "Débloqué le {{date}}", "Unlocked on {{date}}"],
    ["pages.profile.badges.progress", "{{current}} / {{target}}", "{{current}} / {{target}}"],
    ["pages.profile.badges.comingSoon", "Bientôt", "Coming soon"],
    ["pages.profile.badges.specialistGroup", "Spécialiste {{unlocked}} / {{total}}", "Specialist {{unlocked}} / {{total}}"],
    ["pages.profile.badges.errorTitle", "Badges indisponibles.", "Badges unavailable."],
    ["pages.profile.badges.emptyTitle", "Aucun badge", "No badge"],
    ["pages.profile.badges.emptyDescription", "Les badges apparaîtront ici.", "Badges will show up here."],
    ["pages.profile.badges.kinds.firstSip.name", "Première gorgée", "First sip"],
    ["pages.profile.badges.kinds.firstSip.criterion", "Découvrir une première bière", "Discover a first beer"],
    ["pages.profile.badges.kinds.explorer.name", "Explorateur", "Explorer"],
    ["pages.profile.badges.kinds.explorer.criterion", "Découvrir {{count}} bières", "Discover {{count}} beers"],
    ["pages.profile.badges.kinds.collector.name", "Collectionneur", "Collector"],
    ["pages.profile.badges.kinds.collector.criterion", "Découvrir {{count}} bières", "Discover {{count}} beers"],
    ["pages.profile.badges.kinds.completionist.name", "Complétiste", "Completionist"],
    [
      "pages.profile.badges.kinds.completionist.criterion",
      "Découvrir les {{count}} bières du catalogue",
      "Discover all {{count}} beers in the catalogue",
    ],
    ["pages.profile.badges.kinds.globetrotter.name", "Globe-trotter", "Globetrotter"],
    ["pages.profile.badges.kinds.globetrotter.criterion", "Goûter des bières de {{count}} pays", "Taste beers from {{count}} countries"],
    ["pages.profile.badges.kinds.specialist.name", "Spécialiste", "Specialist"],
    ["pages.profile.badges.kinds.specialist.criterion", "Découvrir toutes les bières d'une famille", "Discover every beer of a family"],
    ["pages.profile.badges.kinds.photographer.name", "Photographe", "Photographer"],
    ["pages.profile.badges.kinds.photographer.criterion", "{{count}} dégustations avec photo", "{{count}} tastings with a photo"],
    ["pages.profile.badges.kinds.regular.name", "Habitué", "Regular"],
    ["pages.profile.badges.kinds.regular.criterion", "Déguster {{count}} jours de suite", "Taste on {{count}} days in a row"],
    ["pages.profile.badges.kinds.sentinel.name", "Sentinelle", "Sentinel"],
    ["pages.profile.badges.kinds.sentinel.criterion", "Voter {{count}} fois sur la carte", "Vote {{count}} times on the map"],
    ["pages.profile.badges.kinds.cartographer.name", "Cartographe", "Cartographer"],
    ["pages.profile.badges.kinds.cartographer.criterion", "Proposer un lieu ou signaler une bière", "Suggest a place or report a beer"],
  ];

  it("translates the badges keys in French", () => {
    expect(entries.map(([key]) => readKey(fr, key))).toEqual(entries.map(([, french]) => french));
  });

  it("translates the badges keys in English", () => {
    expect(entries.map(([key]) => readKey(en, key))).toEqual(entries.map(([, , english]) => english));
  });
});

describe("profile stats copy", () => {
  const entries: [string, string, string][] = [
    ["pages.profile.stats.title", "Statistiques", "Statistics"],
    ["pages.profile.stats.checkins", "Dégustations", "Tastings"],
    ["pages.profile.stats.discovered", "Bières découvertes", "Beers discovered"],
    ["pages.profile.stats.averageAbv", "Degré moyen", "Average strength"],
    ["pages.profile.stats.averageRating", "Note moyenne", "Average rating"],
    ["pages.profile.stats.ratingValue", "{{rating}} / 5", "{{rating}} / 5"],
    ["pages.profile.stats.favoriteFamily", "Famille préférée", "Favourite family"],
    ["pages.profile.stats.currentStreak", "Série en cours", "Current streak"],
    ["pages.profile.stats.bestStreak", "Meilleure série", "Best streak"],
    ["pages.profile.stats.days_one", "{{count}} jour", "{{count}} day"],
    ["pages.profile.stats.days_other", "{{count}} jours", "{{count}} days"],
    ["pages.profile.stats.countries", "Pays goûtés", "Countries tasted"],
    ["pages.profile.stats.countryCount", "{{country}} · {{count}}", "{{country}} · {{count}}"],
    ["pages.profile.stats.none", "—", "—"],
    ["pages.profile.stats.errorTitle", "Statistiques indisponibles.", "Statistics unavailable."],
  ];

  it("translates the stats keys in French", () => {
    expect(entries.map(([key]) => readKey(fr, key))).toEqual(entries.map(([, french]) => french));
  });

  it("translates the stats keys in English", () => {
    expect(entries.map(([key]) => readKey(en, key))).toEqual(entries.map(([, , english]) => english));
  });
});

describe("profile wishlist copy", () => {
  const FR = {
    title: "À goûter",
    remove: "Retirer",
    removeLabel: "Retirer {{name}} des envies",
    removed: "Retirée de vos envies.",
    emptyTitle: "Aucune envie pour l'instant",
    emptyDescription: "Ajoutez des bières « À goûter » depuis l'Encyclopédie.",
    errorTitle: "Liste d'envies indisponible.",
  };
  const EN = {
    title: "To taste",
    remove: "Remove",
    removeLabel: "Remove {{name}} from the wishlist",
    removed: "Removed from your wishlist.",
    emptyTitle: "No wishlist yet",
    emptyDescription: "Add beers “To taste” from the encyclopedia.",
    errorTitle: "Wishlist unavailable.",
  };

  it("translates every pages.profile.wishlist key in french and english", () => {
    Object.entries(FR).forEach(([key, value]) => expect(readKey(fr, `pages.profile.wishlist.${key}`)).toBe(value));
    Object.entries(EN).forEach(([key, value]) => expect(readKey(en, `pages.profile.wishlist.${key}`)).toBe(value));
  });
});

describe("venue search keys", () => {
  const FR = {
    trigger: "Rechercher un lieu",
    title: "Rechercher un lieu",
    label: "Nom d'un lieu ou d'une ville",
    clear: "Effacer la recherche",
    hint: "Tapez le nom d'un lieu ou d'une ville",
    errorTitle: "Impossible de chercher les lieux.",
    emptyTitle: "Aucun lieu trouvé",
    emptyDescription: "Essayez un autre nom ou une autre ville.",
    emptyWithFilters: "Aucun lieu ne correspond avec les filtres actifs. Essayez d'en retirer.",
  };
  const EN = {
    trigger: "Search a place",
    title: "Search a place",
    label: "Place or city name",
    clear: "Clear search",
    hint: "Type the name of a place or a city",
    errorTitle: "Could not search places.",
    emptyTitle: "No place found",
    emptyDescription: "Try another name or city.",
    emptyWithFilters: "No place matches with the active filters. Try removing some.",
  };

  it("translates every pages.map.search key in french and english", () => {
    Object.entries(FR).forEach(([key, value]) => expect(readKey(fr, `pages.map.search.${key}`)).toBe(value));
    Object.entries(EN).forEach(([key, value]) => expect(readKey(en, `pages.map.search.${key}`)).toBe(value));
  });
});

describe("beer reviews summary copy", () => {
  const keys = [
    "pages.beerDetail.reviews.title",
    "pages.beerDetail.reviews.noRating",
    "pages.beerDetail.reviews.ratingLabel",
    "pages.beerDetail.reviews.count_one",
    "pages.beerDetail.reviews.count_other",
    "pages.beerDetail.reviews.histogram.label",
    "pages.beerDetail.reviews.histogram.stars_one",
    "pages.beerDetail.reviews.histogram.stars_other",
    "pages.beerDetail.reviews.histogram.bar",
    "pages.beerDetail.reviews.criteria.label",
    "pages.beerDetail.reviews.criteria.value",
    "pages.beerDetail.reviews.criteria.hidden_one",
    "pages.beerDetail.reviews.criteria.hidden_other",
  ];

  it("translates the reviews summary keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Avis",
      "Pas encore de note",
      "{{rating}} sur 5",
      "{{count}} avis",
      "{{count}} avis",
      "Répartition des notes",
      "{{count}} étoile",
      "{{count}} étoiles",
      "{{stars}} : {{reviews}}",
      "Moyennes de la communauté",
      "{{name}} {{average}} / 5 · {{level}}",
      "{{name}} : encore {{count}} avis pour afficher ce critère",
      "{{name}} : encore {{count}} avis pour afficher ce critère",
    ]);
  });

  it("translates the reviews summary keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Reviews",
      "No rating yet",
      "{{rating}} out of 5",
      "{{count}} review",
      "{{count}} reviews",
      "Rating breakdown",
      "{{count}} star",
      "{{count}} stars",
      "{{stars}}: {{reviews}}",
      "Community averages",
      "{{name}} {{average}} / 5 · {{level}}",
      "{{name}}: {{count}} more review to show this criterion",
      "{{name}}: {{count}} more reviews to show this criterion",
    ]);
  });

  it("names the three criteria and labels their fifteen levels in both languages", () => {
    const criteriaKeys = getDeepKeys(fr).filter((key) =>
      key.startsWith("beer.criteria."),
    );
    expect(criteriaKeys).toHaveLength(18);
    criteriaKeys.forEach((key) => {
      expect(readKey(fr, key)).toEqual(expect.any(String));
      expect(readKey(en, key)).toEqual(expect.any(String));
    });
    expect(readKey(fr, "beer.criteria.sweetness.levels.2")).toBe("Sèche");
    expect(readKey(en, "beer.criteria.sweetness.levels.2")).toBe("Dry");
    expect(readKey(en, "beer.criteria.body.levels.5")).toBe("Very full");
  });
});

describe("beer reviews list copy", () => {
  const keys = [
    "pages.beerDetail.reviews.list.mine",
    "pages.beerDetail.reviews.list.errorTitle",
    "pages.beerDetail.reviews.list.emptyTitle",
    "pages.beerDetail.reviews.list.emptyDescription",
    "pages.beerDetail.reviews.list.loadMore",
    "pages.beerDetail.reviews.list.criterion",
  ];

  it("translates the reviews list keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Mon avis",
      "Impossible de charger les avis.",
      "Aucun avis pour l'instant",
      "Soyez le premier à donner votre avis.",
      "Voir plus",
      "{{name}} : {{level}}",
    ]);
  });

  it("translates the reviews list keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "My review",
      "Couldn't load the reviews.",
      "No reviews yet",
      "Be the first to review it.",
      "Show more",
      "{{name}}: {{level}}",
    ]);
  });
});

describe("beer review form copy", () => {
  const keys = [
    "pages.beerDetail.reviews.form.rating",
    "pages.beerDetail.reviews.form.ratingValue",
    "pages.beerDetail.reviews.form.noRating",
    "pages.beerDetail.reviews.form.ratingRequired",
    "pages.beerDetail.reviews.form.notRated",
    "pages.beerDetail.reviews.form.text",
    "pages.beerDetail.reviews.form.textCount",
    "pages.beerDetail.reviews.form.submit",
  ];

  it("translates the review form keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Note",
      "{{rating}} sur 5",
      "Aucune note",
      "La note est obligatoire",
      "Non renseigné",
      "Votre avis",
      "{{count}} / 500",
      "Publier mon avis",
    ]);
  });

  it("translates the review form keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Rating",
      "{{rating}} out of 5",
      "No rating",
      "Please choose a rating",
      "Not rated",
      "Your review",
      "{{count}} / 500",
      "Publish my review",
    ]);
  });
});

describe("beer review sheet copy", () => {
  const keys = [
    "pages.beerDetail.reviews.sheet.open",
    "pages.beerDetail.reviews.sheet.edit",
    "pages.beerDetail.reviews.sheet.title",
    "pages.beerDetail.reviews.sheet.saved",
    "pages.beerDetail.reviews.checkinRequired",
  ];

  it("translates the review sheet keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Donner mon avis",
      "Modifier mon avis",
      "Votre avis sur {{name}}",
      "Avis enregistré",
      "Enregistrez d'abord une dégustation de cette bière.",
    ]);
  });

  it("translates the review sheet keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Write a review",
      "Edit my review",
      "Your review of {{name}}",
      "Review saved",
      "Check in this beer first.",
    ]);
  });
});

describe("beer review delete copy", () => {
  const keys = [
    "pages.beerDetail.reviews.delete.action",
    "pages.beerDetail.reviews.delete.confirmTitle",
    "pages.beerDetail.reviews.delete.cancel",
    "pages.beerDetail.reviews.delete.confirm",
    "pages.beerDetail.reviews.delete.done",
  ];

  it("translates the review delete keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Supprimer mon avis",
      "Supprimer votre avis ?",
      "Annuler",
      "Supprimer",
      "Avis supprimé",
    ]);
  });

  it("translates the review delete keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Delete my review",
      "Delete your review?",
      "Cancel",
      "Delete",
      "Review deleted",
    ]);
  });
});
describe("avatar keys", () => {
  const keys = [
    "avatar.label",
    "avatar.pickerLabel",
    "avatar.names.hop",
    "avatar.names.malt",
    "avatar.names.glass",
    "avatar.names.mug",
    "avatar.names.bottle",
    "avatar.names.can",
    "avatar.names.barrel",
    "avatar.names.tap",
    "avatar.names.cap",
    "avatar.names.foam",
    "avatar.names.wheat",
    "avatar.names.pretzel",
  ];

  it("translates the avatar keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Avatar {{name}}",
      "Choisir un avatar",
      "Houblon",
      "Malt",
      "Verre",
      "Chope",
      "Bouteille",
      "Canette",
      "Tonneau",
      "Tireuse",
      "Capsule",
      "Mousse",
      "Blé",
      "Bretzel",
    ]);
  });

  it("translates the avatar keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "{{name}} avatar",
      "Choose an avatar",
      "Hop",
      "Malt",
      "Glass",
      "Mug",
      "Bottle",
      "Can",
      "Barrel",
      "Tap",
      "Cap",
      "Foam",
      "Wheat",
      "Pretzel",
    ]);
  });
});

describe("feed card keys", () => {
  const expected: [string, string, string][] = [
    ["pages.home.feed.drank", "a bu", "drank"],
    ["pages.home.feed.discovery", "Nouvelle découverte", "New discovery"],
    ["pages.home.feed.rating", "{{rating}} / 5", "{{rating}} / 5"],
    ["pages.home.feed.ratingLabel", "Note {{rating}} sur 5", "Rated {{rating}} out of 5"],
    ["level.short", "Niv. {{level}} · {{title}}", "Lvl {{level}} · {{title}}"],
    ["level.titles.curious", "Curieux", "Curious"],
    ["level.titles.taster", "Dégustateur", "Taster"],
    ["level.titles.hopHead", "Houblonneur", "Hop head"],
    ["level.titles.finePalate", "Fin palais", "Fine palate"],
    ["level.titles.masterBrewer", "Maître brasseur", "Master brewer"],
    ["level.titles.foamLegend", "Légende de la mousse", "Foam legend"],
    ["common.time.justNow", "à l'instant", "just now"],
  ];

  it.each(expected)("translates %s in French and in English", (key, french, english) => {
    expect(readKey(fr, key)).toBe(french);
    expect(readKey(en, key)).toBe(english);
  });
});

describe("home feed copy", () => {
  const keys = [
    "pages.home.feed.title",
    "pages.home.feed.emptyTitle",
    "pages.home.feed.emptyDescription",
    "pages.home.feed.emptyAction",
    "pages.home.feed.errorTitle",
    "pages.home.feed.loadMore",
  ];

  it("translates the feed keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Fil d'actualité",
      "Suivez des profils pour voir leurs dégustations",
      "Leurs dégustations, découvertes et avis apparaîtront ici.",
      "Trouver des profils",
      "Impossible de charger le fil",
      "Voir plus",
    ]);
  });

  it("translates the feed keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Activity feed",
      "Follow profiles to see their tastings",
      "Their tastings, discoveries and reviews will show up here.",
      "Find profiles",
      "Could not load the feed",
      "Load more",
    ]);
  });
});

describe("profile social keys", () => {
  const keys = [
    "pages.profile.social.progressLabel",
    "pages.profile.social.progressToTitle",
    "pages.profile.social.maxLevel",
    "pages.profile.social.followers_one",
    "pages.profile.social.followers_other",
    "pages.profile.social.following_one",
    "pages.profile.social.following_other",
    "pages.profile.social.errorTitle",
  ];

  it("translates the social keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Progression",
      "{{current}} / {{next}} pour {{title}}",
      "Niveau maximal",
      "{{count}} abonné",
      "{{count}} abonnés",
      "{{count}} abonnement",
      "{{count}} abonnements",
      "Impossible de charger le profil",
    ]);
  });

  it("translates the social keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Progress",
      "{{current}} / {{next}} to {{title}}",
      "Max level",
      "{{count}} follower",
      "{{count}} followers",
      "{{count}} following",
      "{{count}} following",
      "Could not load the profile",
    ]);
  });
});

describe("profile edit keys", () => {
  const keys = [
    "pages.profile.edit.open",
    "pages.profile.edit.title",
    "pages.profile.edit.nameLabel",
    "pages.profile.edit.nameHint",
    "pages.profile.edit.nameError",
    "pages.profile.edit.save",
    "pages.profile.edit.saved",
  ];

  it("translates the edit keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Modifier",
      "Modifier mon profil",
      "Nom d'affichage",
      "2 à 24 caractères",
      "Entre 2 et 24 caractères",
      "Enregistrer",
      "Profil enregistré",
    ]);
  });

  it("translates the edit keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Edit",
      "Edit my profile",
      "Display name",
      "2 to 24 characters",
      "Between 2 and 24 characters",
      "Save",
      "Profile saved",
    ]);
  });
});

describe("people keys", () => {
  const keys = [
    "pages.people.title",
    "pages.people.subtitle",
    "pages.people.you",
    "pages.people.discovered_one",
    "pages.people.discovered_other",
    "pages.people.errorTitle",
  ];

  it("translates the people keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Profils",
      "Les amateurs de Mousse à suivre.",
      "Vous",
      "{{count}} bière découverte",
      "{{count}} bières découvertes",
      "Impossible de charger les profils",
    ]);
  });

  it("translates the people keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Profiles",
      "Mousse fans to follow.",
      "You",
      "{{count}} beer discovered",
      "{{count}} beers discovered",
      "Could not load the profiles",
    ]);
  });
});

describe("follow keys", () => {
  const keys = ["follow.follow", "follow.following", "follow.label", "follow.followed", "follow.unfollowed"];

  it("translates the follow keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Suivre",
      "Suivi",
      "Suivre {{name}}",
      "Vous suivez {{name}}",
      "Vous ne suivez plus {{name}}",
    ]);
  });

  it("translates the follow keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Follow",
      "Following",
      "Follow {{name}}",
      "You follow {{name}}",
      "You no longer follow {{name}}",
    ]);
  });
});

describe("user profile keys", () => {
  const keys = ["pages.userProfile.notFoundTitle", "pages.userProfile.notFoundDescription", "pages.userProfile.seeProfiles"];

  it("translates the user profile keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual(["Profil introuvable", "Ce profil n'existe pas ou plus.", "Voir les profils"]);
  });

  it("translates the user profile keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual(["Profile not found", "This profile does not exist.", "See profiles"]);
  });
});

describe("follow list keys", () => {
  const keys = [
    "followList.followers",
    "followList.following",
    "followList.empty",
    "followList.emptyDescription",
    "followList.errorTitle",
  ];

  it("translates the follow list keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Abonnés de {{name}}",
      "Abonnements de {{name}}",
      "Aucun profil pour l'instant",
      "Les profils apparaîtront ici.",
      "Impossible de charger la liste",
    ]);
  });

  it("translates the follow list keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "{{name}}'s followers",
      "Followed by {{name}}",
      "No profile yet",
      "Profiles will show up here.",
      "Could not load the list",
    ]);
  });
});

describe("collection creation keys", () => {
  const keys = [
    "collections.create.open",
    "collections.create.title",
    "collections.create.nameLabel",
    "collections.create.nameHint",
    "collections.create.nameError",
    "collections.create.save",
    "collections.create.nameTaken",
    "collections.create.limitReached",
  ];

  it("translates the collection creation keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Nouvelle collection",
      "Nouvelle collection",
      "Nom de la collection",
      "1 à 40 caractères",
      "Entre 1 et 40 caractères",
      "Créer",
      "Ce nom est déjà pris",
      "20 collections au plus",
    ]);
  });

  it("translates the collection creation keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "New collection",
      "New collection",
      "Collection name",
      "1 to 40 characters",
      "Between 1 and 40 characters",
      "Create",
      "This name is already taken",
      "20 collections at most",
    ]);
  });
});

describe("collection page copy", () => {
  const keys = [
    "pages.collection.drunk",
    "pages.collection.undrunk",
    "pages.collection.notFoundTitle",
    "pages.collection.notFoundDescription",
    "pages.collection.backToProfile",
    "pages.collection.emptyTitle",
    "pages.collection.emptyDescription",
    "pages.collection.errorTitle",
  ];

  it("translates the collection page keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Déjà bue",
      "Pas encore",
      "Collection introuvable",
      "Cette collection n'existe pas ou vous n'y avez pas accès.",
      "Retour au profil",
      "Cette collection est vide",
      "Les bières ajoutées apparaîtront ici.",
      "Collection indisponible.",
    ]);
  });

  it("translates the collection page keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Already tasted",
      "Not yet",
      "Collection not found",
      "This collection does not exist or you cannot see it.",
      "Back to profile",
      "This collection is empty",
      "Added beers will show up here.",
      "Collection unavailable.",
    ]);
  });
});

describe("collection rename and delete copy", () => {
  const keys = [
    "pages.collection.rename",
    "pages.collection.renameLabel",
    "pages.collection.renameSave",
    "pages.collection.renameCancel",
    "pages.collection.delete",
    "pages.collection.deleteTitle",
    "pages.collection.deleteCancel",
    "pages.collection.deleteConfirm",
    "pages.collection.deleteSuccess",
  ];

  it("translates the rename and delete keys in French", () => {
    expect(keys.map((key) => readKey(fr, key))).toEqual([
      "Renommer",
      "Nouveau nom",
      "Enregistrer",
      "Annuler",
      "Supprimer",
      "Supprimer cette collection ?",
      "Annuler",
      "Supprimer",
      "Collection supprimée",
    ]);
  });

  it("translates the rename and delete keys in English", () => {
    expect(keys.map((key) => readKey(en, key))).toEqual([
      "Rename",
      "New name",
      "Save",
      "Cancel",
      "Delete",
      "Delete this collection?",
      "Cancel",
      "Delete",
      "Collection deleted",
    ]);
  });
});

describe("lazy page loading label", () => {
  it("translates the lazy page loading label in every locale", () => {
    expect(readKey(fr, "lazyPage.loadingLabel")).toBe("Chargement de la page…");
    expect(readKey(en, "lazyPage.loadingLabel")).toBe("Loading the page…");
  });
});

describe("offline banner copy", () => {
  it("translates the offline message in every locale", () => {
    expect(readKey(fr, "pwa.offline")).toBe("Vous êtes hors ligne");
    expect(readKey(en, "pwa.offline")).toBe("You are offline");
  });
});
