// API F13 (reel, SEED_DEMO_ACTIVITY=true) : PATCH /checkins/{id} et recherches tolerantes aux fautes.
const API = "http://localhost:5090/api/v1"; const results = [];
const log = (id, ok, d) => { results.push({ id, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const H = (u, json = false) => ({ "X-User-Id": String(u), ...(json ? { "Content-Type": "application/json" } : {}) }); const J = async (r) => { const x = await r.text(); try { return x ? JSON.parse(x) : null; } catch { return x; } };
const get = async (p, u = 1) => J(await fetch(API + p, { headers: H(u) })); const patch = (id, u, body) => fetch(`${API}/checkins/${id}`, { method: "PATCH", headers: H(u, true), body: JSON.stringify(body) });
const post = async (u, fields) => { const f = new FormData(); for (const [k, v] of Object.entries(fields)) f.append(k, String(v)); const r = await fetch(API + "/checkins", { method: "POST", headers: H(u), body: f }); return { status: r.status, body: await J(r) }; };
const venues = await get("/venues"); const cluny = venues.find((v) => v.name === "La Taverne de Cluny");
const c = await post(1, { beerId: 20, drankAt: new Date(Date.now() - 7200e3).toISOString(), place: "Chez Marc", format: "bottle", rating: 3, comment: "Faute de frape", price: 4.5 }); const id = c.body.checkin.id;
// PATCH
let r = await patch(id, 1, { comment: "Corrigé" }); let b = await J(r); log("P.200-commentaire", r.status === 200 && b.comment === "Corrigé" && b.rating === 3 && b.price === 4.5 && b.place === "Chez Marc", `${r.status} ${b?.comment} note=${b?.rating} prix=${b?.price}`);
r = await patch(id, 1, { rating: 5, format: "can", aromas: ["fruity"], price: 6 }); b = await J(r); log("P.200-plusieurs-champs", r.status === 200 && b.rating === 5 && b.format === "can" && b.price === 6, `${r.status} ${JSON.stringify({ rating: b?.rating, format: b?.format, aromas: b?.aromas })}`);
r = await patch(id, 1, { rating: null, price: null }); b = await J(r); log("P.null-efface-note-et-prix", r.status === 200 && b.rating === null && b.price === null, `${r.status} rating=${b?.rating} price=${b?.price}`);
r = await patch(id, 1, { place: cluny.name, venueId: cluny.id }); b = await J(r); log("P.lier-un-lieu", r.status === 200 && b.venueId === cluny.id, `venueId=${b?.venueId}`);
r = await patch(id, 1, { comment: "Encore" }); b = await J(r); log("P.lien-garde-si-lieu-absent", b.venueId === cluny.id && b.place === cluny.name, `venueId=${b?.venueId}`);
r = await patch(id, 1, { place: "Chez moi" }); b = await J(r); log("P.texte-libre-delie", r.status === 200 && b.venueId === null && b.place === "Chez moi", `venueId=${b?.venueId} place=${b?.place}`);
r = await patch(id, 1, { venueId: cluny.id }); log("P.venueId-sans-place-400", r.status === 400, r.status);
r = await patch(id, 1, { place: "X", venueId: 99999 }); log("P.lieu-inconnu-404", r.status === 404, `${r.status} ${JSON.stringify(await J(r))}`);
r = await patch(id, 1, {}); log("P.corps-vide-400", r.status === 400, `${r.status} ${JSON.stringify(await J(r))}`);
r = await patch(id, 1, { beerId: 3 }); b = await J(r); log("P.beerId-refuse-400", r.status === 400 && /should not exist/.test(JSON.stringify(b)), `${r.status} ${JSON.stringify(b)}`);
r = await patch(id, 1, { drankAt: new Date(Date.now() + 86400e3).toISOString() }); log("P.date-future-400", r.status === 400, r.status);
r = await patch(id, 1, { rating: 7 }); log("P.note-7-400", r.status === 400, r.status);
r = await patch(id, 1, { comment: "x".repeat(501) }); log("P.commentaire-501-400", r.status === 400, r.status);
r = await patch(id, 1, { comment: null }); log("P.comment-null-400-ou-vide", r.status === 400 || (await J(r)).comment === "", r.status);
r = await patch(id, 2, { comment: "pirate" }); log("P.autre-utilisateur-403", r.status === 403, `${r.status} ${JSON.stringify(await J(r))}`);
r = await patch(99999, 1, { comment: "x" }); log("P.inconnue-404", r.status === 404, `${r.status} ${JSON.stringify(await J(r))}`);
r = await fetch(`${API}/checkins/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ beerId: 1 }) }); log("P.401-avant-400", r.status === 401, r.status);
const one = await get(`/checkins/${id}`); log("P.relu-par-GET", one.comment === "Encore" && one.place === "Chez moi", `${one.comment} / ${one.place}`);
const list = await get("/checkins?beerId=20"); log("P.relu-dans-le-journal", list.items.some((x) => x.id === id && x.comment === "Encore"), `${list.items.length} entree(s)`);
const dex = await get("/me/dex"); log("P.pokedex-inchange", dex.discovered >= 1, `${dex.discovered}/${dex.total}`);
// recherche de bieres
let s = await get("/beers?q=cantillon"); log("S.exact-pas-approximatif", s.isApproximate === false && s.items.length >= 3, `${s.items.length} resultats, isApproximate=${s.isApproximate}`);
s = await get("/beers?q=cantilon"); log("S.cantilon-trouve-cantillon", s.isApproximate === true && s.items.some((x) => /Cantillon/.test(x.breweryName)), `${s.items.length} resultats, isApproximate=${s.isApproximate}`);
s = await get("/beers?q=chimay%20bleu"); log("S.deux-mots-exacts", s.isApproximate === false && s.items.length >= 1, `${s.items.length}`);
s = await get("/beers?q=chimmay"); log("S.chimmay", s.isApproximate === true && s.items.some((x) => /Chimay/.test(x.breweryName)), `${s.items.length} isApproximate=${s.isApproximate}`);
s = await get("/beers?q=Cantilon&page=1"); log("S.casse-accents", s.isApproximate === true, `${s.items.length}`);
s = await get("/beers?q=zzzzzz"); log("S.aucun-reste-vide", s.items.length === 0 && s.isApproximate === false, `${s.items.length} isApproximate=${s.isApproximate}`);
s = await get("/beers?q=xyz"); log("S.mot-court-sans-repli", s.items.length === 0 && s.isApproximate === false, `${s.items.length}`);
s = await get("/beers?q=cantilon&family=ipa"); log("S.filtre-garde-dans-le-repli", s.items.length === 0 && s.isApproximate === false, `famille IPA + cantilon : ${s.items.length}`);
s = await get("/beers?q=cantilon&abvMin=1"); log("S.filtre-abv-dans-le-repli", s.items.every((x) => x.abv >= 1), `${s.items.length}`);
s = await get("/beers"); log("S.liste-sans-q-pas-approximatif", s.isApproximate === false, s.isApproximate);
s = await get("/beers?q=%25"); log("S.pourcent-litteral", s.isApproximate === false || s.items.length === 0, `${s.items.length}`);
// recherche de lieux
let v = await get("/venues?q=cluny"); log("V.exact", v.length >= 1 && v.every((x) => x.isApproximateMatch === false), `${v.length}`);
v = await get("/venues?q=clunny"); log("V.clunny-trouve-cluny", v.some((x) => x.id === cluny.id) && v.every((x) => x.isApproximateMatch === true), `${v.map((x) => x.name)}`);
v = await get("/venues?q=bruxelle"); log("V.sous-chaine-exacte", v.length >= 1 && v.every((x) => x.isApproximateMatch === false), `${v.length}`);
v = await get("/venues?q=zzzzzz"); log("V.aucun", Array.isArray(v) && v.length === 0, `${v.length}`);
v = await get("/venues"); log("V.sans-q-pas-approximatif", v.every((x) => x.isApproximateMatch === false), `${v.length}`);
v = await get("/venues?q=clunny&type=shop"); log("V.filtre-type-garde", v.every((x) => x.type === "shop"), `${v.length}`);
const ko = results.filter((x) => !x.ok); console.log(`\n${results.length - ko.length}/${results.length} PASS`); if (ko.length) { console.log("ECHECS :", ko.map((x) => x.id).join(", ")); process.exit(1); }
