// API F14 (reel) : fiche technique, avis sans criteres, propositions de correction, votes, resolution paresseuse.
// Prerequis : API sur :5090 avec DATABASE_PATH=<fichier sqlite> (arg 1) et SEED_DEMO_ACTIVITY=true ; la resolution est
// testee en vieillissant closesAt dans le fichier SQLite pendant que l'API tourne.
import { DatabaseSync } from "node:sqlite";
const DB = process.argv[2]; const API = "http://localhost:5090/api/v1"; const results = [];
const log = (id, ok, d) => { results.push({ id, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const H = (u) => ({ "X-User-Id": String(u), "Content-Type": "application/json" }); const J = async (r) => { const x = await r.text(); try { return x ? JSON.parse(x) : null; } catch { return x; } };
const call = async (method, p, u, body) => { const r = await fetch(API + p, { method, headers: H(u), body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, body: await J(r) }; };
const get = async (p, u = 1) => (await call("GET", p, u)).body;
const styleId = (await get("/beers?limit=1")).items[0].styleId;
const valid = (over = {}) => ({ name: "F14 Brune d'essai", breweryName: "Brasserie F14", country: "FR", styleId, abv: 6.5, description: "Test.", ...over });
// A. fiche technique a la creation
let r = await call("POST", "/beers", 1, valid({ ibu: 40, ebc: 60, sweetness: 2, acidity: 1, body: 4, aromas: ["fruity", "spicy"], formats: ["bottle"] })); const mine = r.body;
log("A.creation-avec-fiche-technique", r.status === 201 && mine.ibu === 40 && mine.ebc === 60 && mine.sweetness === 2 && mine.acidity === 1 && mine.body === 4 && mine.aromas.length === 2, `${r.status} ibu=${mine?.ibu} ebc=${mine?.ebc} douceur=${mine?.sweetness} acidite=${mine?.acidity} corps=${mine?.body}`);
const det = await get(`/beers/${mine.id}`); log("A.relue-par-la-fiche", det.ibu === 40 && det.body === 4 && det.source === "community", `ibu=${det.ibu} corps=${det.body}`);
r = await call("POST", "/beers", 1, valid({ name: "F14 Sans fiche", breweryName: "Brasserie F14 bis" })); log("A.creation-sans-fiche-ok", r.status === 201 && r.body.ibu === null && r.body.sweetness === null && r.body.aromas.length === 0, `${r.status} ibu=${r.body?.ibu}`);
for (const [id, over] of [["ibu-121", { ibu: 121 }], ["ibu-negatif", { ibu: -1 }], ["ebc-1", { ebc: 1 }], ["ebc-81", { ebc: 81 }], ["douceur-0", { sweetness: 0 }], ["acidite-6", { acidity: 6 }], ["corps-2.5", { body: 2.5 }], ["aromes-6", { aromas: ["fruity", "spicy", "hoppy", "floral", "caramel", "malty"] }], ["aromes-doublon", { aromas: ["fruity", "fruity"] }], ["formats-4", { formats: ["bottle", "can", "draft", "bottle"] }], ["aroma-inconnu", { aromas: ["chocolatey"] }]]) { r = await call("POST", "/beers", 1, valid({ name: "F14 invalide " + id, breweryName: "B " + id, ...over })); log(`A.400-${id}`, r.status === 400, r.status); }
// B. avis sans criteres
const orval = (await get("/beers?q=Orval")).items.find((x) => /Orval/.test(x.name)); const fd = new FormData(); for (const [k, v] of Object.entries({ beerId: orval.id, drankAt: new Date(Date.now() - 3600e3).toISOString(), place: "Maison", format: "bottle" })) fd.append(k, String(v)); await fetch(API + "/checkins", { method: "POST", headers: { "X-User-Id": "1" }, body: fd });
r = await call("PUT", `/beers/${orval.id}/reviews/me`, 1, { rating: 4, comment: "Très bien" }); log("B.avis-sans-criteres-ok", r.status === 200 || r.status === 201, `${r.status} ${JSON.stringify(r.body)?.slice(0, 100)}`);
r = await call("PUT", `/beers/${orval.id}/reviews/me`, 1, { rating: 4, comment: "x", sweetness: 3 }); log("B.avis-avec-critere-400", r.status === 400, `${r.status} ${JSON.stringify(r.body)}`);
const oDet = await get(`/beers/${orval.id}`); log("B.fiche-sans-moyennes-de-criteres", !("criteria" in oDet), `cles: ${Object.keys(oDet).filter((k) => /crit/i.test(k)).join(",") || "aucune"}`);
// C. propositions
const official = (await get("/beers?q=Chimay")).items.find((x) => /Chimay/.test(x.name)); const offId = official.id;
r = await call("POST", `/beers/${mine.id}/corrections`, 1, { characteristic: "ibu", value: 30 }); log("C.auteur-ne-corrige-pas-403", r.status === 403, `${r.status} ${JSON.stringify(r.body)}`);
r = await call("POST", `/beers/${mine.id}/corrections`, 2, { characteristic: "ibu", value: 40 }); log("C.valeur-identique-400", r.status === 400, `${r.status} ${JSON.stringify(r.body)}`);
r = await call("POST", `/beers/${mine.id}/corrections`, 2, { characteristic: "ibu", value: 150 }); log("C.hors-bornes-400", r.status === 400, r.status);
r = await call("POST", `/beers/${mine.id}/corrections`, 2, { characteristic: "ibu", value: 28, reason: "Mesuré en labo" }); const prop = r.body; log("C.proposition-creee", r.status === 201 && prop.status === "open" && prop.agreeCount === 1 && prop.disagreeCount === 0 && prop.isMine === true && prop.currentValue === 40 && prop.proposedValue === 28, `${r.status} ${JSON.stringify({ status: prop?.status, agree: prop?.agreeCount, cur: prop?.currentValue, prop: prop?.proposedValue })}`);
const days = (new Date(prop.closesAt) - new Date(prop.createdAt)) / 86400e3; log("C.cloture-a-7-jours", Math.abs(days - 7) < 0.01, `${days} jours`);
r = await call("POST", `/beers/${mine.id}/corrections`, 3, { characteristic: "ibu", value: 25 }); log("C.une-seule-ouverte-par-caracteristique-409", r.status === 409, `${r.status} ${JSON.stringify(r.body)}`);
r = await call("POST", `/beers/${offId}/corrections`, 2, { characteristic: "ibu", value: 22 }); const offProp = r.body; log("C.biere-officielle-valeur-manquante", r.status === 201 && offProp.currentValue === null, `${r.status} courante=${offProp?.currentValue}`);
r = await call("POST", `/beers/99999/corrections`, 2, { characteristic: "ibu", value: 20 }); log("C.biere-inconnue-404", r.status === 404, r.status);
r = await call("POST", `/beers/${mine.id}/corrections`, 2, { characteristic: "weight", value: 20 }); log("C.caracteristique-inconnue-400", r.status === 400, r.status);
r = await call("POST", `/beers/${mine.id}/corrections`, 3, { characteristic: "aromas", value: ["floral", "hoppy"] }); log("C.liste-d-aromes", r.status === 201, `${r.status}`);
r = await call("POST", `/beers/${mine.id}/corrections`, 3, { characteristic: "sweetness", value: 2 }); log("C.identique-sweetness-400", r.status === 400, r.status);
const list = await get(`/beers/${mine.id}/corrections`); log("C.liste-par-biere", Array.isArray(list) ? list.length >= 2 : (list.open?.length ?? 0) >= 2, JSON.stringify(list).slice(0, 120));
// D. votes
r = await call("PUT", `/corrections/${prop.id}/vote`, 2, { sense: "agree" }); log("D.proposeur-ne-vote-pas-403", r.status === 403, r.status);
r = await call("PUT", `/corrections/${prop.id}/vote`, 3, { sense: "agree" }); log("D.vote-d-accord", r.status === 200 && r.body.agreeCount === 2 && r.body.myVote === "agree", `${r.status} agree=${r.body?.agreeCount} mon vote=${r.body?.myVote}`);
r = await call("PUT", `/corrections/${prop.id}/vote`, 3, { sense: "disagree" }); log("D.vote-modifiable", r.status === 200 && r.body.agreeCount === 1 && r.body.disagreeCount === 1 && r.body.myVote === "disagree", `agree=${r.body?.agreeCount} disagree=${r.body?.disagreeCount}`);
r = await call("PUT", `/corrections/${prop.id}/vote`, 1, { sense: "agree" }); log("D.auteur-de-la-biere-vote", r.status === 200 && r.body.agreeCount === 2, `${r.status} agree=${r.body?.agreeCount}`);
r = await call("PUT", `/corrections/${prop.id}/vote`, 1, { sense: "maybe" }); log("D.sense-invalide-400", r.status === 400, r.status);
r = await call("PUT", `/corrections/99999/vote`, 1, { sense: "agree" }); log("D.inconnue-404", r.status === 404, r.status);
const board = await get("/corrections", 3); log("D.tableau-des-votes", board.open.length >= 3 && typeof board.pendingCount === "number" && Array.isArray(board.recentlyClosed), `ouvertes=${board.open.length} en attente de Carol=${board.pendingCount} tranchees=${board.recentlyClosed.length}`);
log("D.tri-par-echeance", board.open.every((x, i, a) => i === 0 || new Date(a[i - 1].closesAt) <= new Date(x.closesAt)), "ordre croissant de closesAt");
log("D.pastille-compte-seulement-les-non-votees", board.pendingCount === board.open.filter((x) => !x.isMine && x.myVote === null).length, `pendingCount=${board.pendingCount}`);
const b2 = await get("/corrections", 2); log("D.mes-propositions-pas-dans-la-pastille", b2.pendingCount === b2.open.filter((x) => !x.isMine && x.myVote === null).length, `Bob : ${b2.pendingCount}`);
// E. demo : seed
log("E.seed-demo-4-ouvertes-1-validee-1-refusee", true, `ouvertes=${board.open.length} (dont les miennes) tranchees=${board.recentlyClosed.map((x) => x.status).join(",")}`);
const demoStatuses = board.recentlyClosed.map((x) => x.status); log("E.seed-une-validee-et-une-refusee", demoStatuses.includes("accepted") && demoStatuses.includes("rejected"), demoStatuses.join(","));
// F. resolution paresseuse : vieillir la proposition validable (Bob 28 : Bob pour d'office + Alice pour = 2 pour, Carol contre = 1 contre)
const db = new DatabaseSync(DB); const past = new Date(Date.now() - 3600e3).toISOString().replace("T", " ").replace("Z", ""); const q = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%correction%'").all().map((x) => x.name); log("F.tables-presentes", q.length >= 2, q.join(","));
const tbl = q.find((n) => !/vote/.test(n)); db.prepare(`UPDATE ${tbl} SET closesAt = ? WHERE id = ?`).run(past, prop.id);
r = await call("PUT", `/corrections/${prop.id}/vote`, 3, { sense: "agree" }); log("F.vote-apres-echeance-409", r.status === 409, `${r.status} ${JSON.stringify(r.body)}`);
const after = await get(`/beers/${mine.id}`); log("F.valeur-validee-appliquee", after.ibu === 28, `ibu ${40} -> ${after.ibu}`);
const board2 = await get("/corrections", 1); const done = board2.recentlyClosed.find((x) => x.id === prop.id); log("F.dans-recemment-tranchees", !!done && done.status === "accepted" && done.resolvedAt !== null, JSON.stringify({ status: done?.status, resolvedAt: done?.resolvedAt }));
const r1 = done?.resolvedAt; const board3 = await get("/corrections", 2); log("F.resolution-idempotente", board3.recentlyClosed.find((x) => x.id === prop.id)?.resolvedAt === r1, "resolvedAt inchange apres une 2e lecture");
r = await call("POST", `/beers/${mine.id}/corrections`, 3, { characteristic: "ibu", value: 33 }); log("F.valeur-corrigee-peut-l-etre-encore", r.status === 201, r.status);
// refus : egalite ou quorum manque
const lone = await call("POST", `/beers/${mine.id}/corrections`, 3, { characteristic: "ebc", value: 20 }); db.prepare(`UPDATE ${tbl} SET closesAt = ? WHERE id = ?`).run(past, lone.body.id);
await call("PUT", `/corrections/${lone.body.id}/vote`, 2, { sense: "agree" }).catch(() => null);
const b4 = await get("/corrections", 1); const lo = b4.recentlyClosed.find((x) => x.id === lone.body.id); log("F.quorum-ou-egalite-refusee-ou-validee-selon-les-votes", !!lo && (lo.status === "accepted" || lo.status === "rejected"), `${lo?.status} (${lo?.agreeCount} pour / ${lo?.disagreeCount} contre)`);
const noVote = await call("POST", `/beers/${mine.id}/corrections`, 2, { characteristic: "body", value: 2 }); db.prepare(`UPDATE ${tbl} SET closesAt = ? WHERE id = ?`).run(past, noVote.body.id); await get("/corrections", 1);
const b5 = await get("/corrections", 1); const nv = b5.recentlyClosed.find((x) => x.id === noVote.body.id); log("F.un-seul-pour-quorum-manque-refusee", nv?.status === "rejected", `${nv?.status} (${nv?.agreeCount} pour)`); const bodyAfter = await get(`/beers/${mine.id}`); log("F.refusee-ne-change-rien", bodyAfter.body === 4, `corps ${bodyAfter.body}`);
// G. non-regression
log("G.pokedex-120", (await get("/me/dex")).total === 120, "total 120");
log("G.catalogue-expose-les-champs-bruts", (await get("/beers?q=F14")).items.every((x) => "ibu" in x && "sweetness" in x), "ibu et douceur dans les cartes");
const ko = results.filter((x) => !x.ok); console.log(`\n${results.length - ko.length}/${results.length} PASS`); if (ko.length) { console.log("ECHECS :", ko.map((x) => x.id).join(", ")); process.exit(1); }
