export const meta = {
  name: 'speckit-us-after-parallel',
  description: 'Barriere d abord, puis Promise.all sur le groupe parallel. Par US : Sonnet sk-worker, puis reviewer Opus qui rend PASS, FIXED (il a corrige lui-meme), FAIL (passe de fix Sonnet puis review2) ou ESCALATE (arbitrage humain). Revue sans verdict relancee une fois. Zero Haiku.',
  phases: [
    { title: 'US', detail: 'Sonnet medium RED GREEN REFACTOR + commit DONE', model: 'sonnet' },
    { title: 'Review', detail: 'Opus medium relit le commit contre la spec, corrige lui-meme ce qui est plus court a faire qu a expliquer', model: 'opus' },
  ],
}

function parseArgs(raw) {
  if (raw == null || raw === '') return {}
  if (typeof raw !== 'string') return raw || {}
  try { return JSON.parse(raw) } catch (e) {
    log('args JSON invalide')
    return { __parseError: true }
  }
}
const cfg = parseArgs(args)
const barrier = cfg.__parseError ? null : (cfg.barrier || null)
const parallelGroups = (cfg.__parseError || !Array.isArray(cfg.parallel)) ? [] : cfg.parallel
const fanOut = typeof parallel === 'function'
  ? function (thunks) { return parallel(thunks) }
  : function (thunks) { return Promise.all(thunks.map(function (fn) { return fn() })) }
function collidingRoots(groups) {
  if (groups.length < 2) return false
  const roots = []
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]
    const r = g && (g.root || g.cwd)
    if (!r) return true
    roots.push(String(r))
  }
  return new Set(roots).size < roots.length
}

// ---- BEGIN shared-review-fix (keep byte-identical in speckit-us-loop.js and speckit-us-after-parallel.js) ----
const US_SCHEMA = {
  type: 'object',
  required: ['stopped'],
  properties: {
    stopped: { type: 'boolean' },
    reason: { type: 'string' },
    // Handoff to the fix pass: without it the fix agent starts cold and redoes
    // the whole recon (measured on 916: 11.8 min of recon out of a 19 min fix).
    commit: { type: 'string' },
    filesTouched: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    // What the worker had to establish ON ITS OWN and that later US reuse
    // (existing component, data source, test trap). The parent appends them
    // to FEATURE_DIR/recon.md and to the next briefs.
    facts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['fact', 'source'],
        properties: {
          fact: { type: 'string' },
          source: { type: 'string' },
        },
      },
    },
    // Filled as soon as DESIGN_PATH is given: one entry per #C<n> anchor of the
    // US. A gap is fixed before DONE or escalated.
    designConformance: {
      type: 'array',
      items: {
        type: 'object',
        required: ['anchor', 'status'],
        properties: {
          anchor: { type: 'string' },
          status: { type: 'string' },
          gaps: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

// The reviewer decides who fixes, the script only routes on its verdict:
// PASS (nothing to do), FIXED (it fixed the gaps itself, cheaper than briefing
// a fresh agent: 916 US9 paid a 6 min fix + a 4 min review2 for two tests it had
// already written out), FAIL (a fix pass is worth it), ESCALATE (a human must
// arbitrate: file outside the US paths, wrong or silent task/spec/design).
const VERDICTS = ['PASS', 'FIXED', 'FAIL', 'ESCALATE']
const NOTE_SCHEMA = {
  type: 'object',
  required: ['text'],
  properties: { text: { type: 'string' }, file: { type: 'string' } },
}
const REVIEW_SCHEMA = {
  type: 'object',
  required: ['verdict', 'issues'],
  properties: {
    verdict: { type: 'string', enum: VERDICTS },
    // FAIL: what the fix pass must do. ESCALATE: what needs arbitration.
    // PASS / FIXED: non-blocking remarks, kept on the row.
    issues: { type: 'array', items: NOTE_SCHEMA },
    // What the reviewer fixed itself, and the commit that carries it.
    fixes: { type: 'array', items: NOTE_SCHEMA },
    commit: { type: 'string' },
    // sha256 of CONTRACT_PATH as the reviewer measured it (check 9). The after-parallel engine
    // reads the freeze from it instead of paying a dedicated hash agent on the critical path.
    contractSha256: { type: 'string' },
  },
}

// A verdict outside the enum, or no output at all (agent crashed, network error):
// ERROR, retried once, never read as a FAIL.
function verdictOf(out) {
  if (!out || typeof out !== 'object') return 'ERROR'
  const v = String(out.verdict || '').trim().toUpperCase()
  return VERDICTS.indexOf(v) >= 0 ? v : 'ERROR'
}

function notesOf(list) {
  if (!Array.isArray(list)) return []
  return list.map(function (it) {
    if (typeof it === 'string') return { text: it }
    const text = String((it && (it.text || it.issue || it.message)) || JSON.stringify(it))
    return it && it.file ? { text: text, file: String(it.file) } : { text: text }
  })
}

function issuesOf(out) {
  return out && typeof out === 'object' ? notesOf(out.issues) : []
}

function formatNotes(notes) {
  return notes.map(function (i) { return '- ' + (i.file ? i.file + ' : ' : '') + i.text }).join('\n')
}

function workerStopped(out) {
  return !out || typeof out !== 'object' || out.stopped === true
}

function reasonOf(out) {
  return out && typeof out === 'object' ? String(out.reason || 'stopped') : 'error'
}

// The reviewer brief is static (written before the worker runs): without this
// block it cannot see what the worker declared, so "declared unreachable -> escalate"
// never applied (916 US24: "the worker declared no gap", while it had).
function reviewHandoffOf(out) {
  if (!out || typeof out !== 'object') return ''
  const parts = []
  if (out.commit) parts.push('Commit : ' + out.commit)
  if (out.summary) parts.push('Resume : ' + out.summary)
  if (Array.isArray(out.designConformance) && out.designConformance.length) {
    parts.push('designConformance :\n' + out.designConformance.map(function (d) {
      return '- ' + d.anchor + ' ' + d.status + (Array.isArray(d.gaps) && d.gaps.length ? ' : ' + d.gaps.join(' ; ') : '')
    }).join('\n'))
  }
  if (!parts.length) return ''
  return '\n\n## Declare par le worker — a verifier, pas a croire\n' + parts.join('\n')
}

async function reviewOnce(g, id, label, handoff) {
  return agent(g.reviewPrompt + (handoff || ''), {
    label: label + ':' + id,
    phase: 'Review',
    model: 'opus',
    effort: 'medium',
    agentType: 'sk-reviewer',
    schema: REVIEW_SCHEMA,
  })
}

// A FAIL or an ESCALATE without a single issue gives nobody anything to act on:
// an unreadable review, retried like one (916 US15: a network failure read as FAIL
// paid a fix on an empty list, then a review2). A FIXED without a commit left its
// edits in the tree, where the next `git add -A` would swallow them.
function reviewVerdict(out) {
  const verdict = verdictOf(out)
  if ((verdict === 'FAIL' || verdict === 'ESCALATE') && issuesOf(out).length === 0) return 'ERROR'
  if (verdict === 'FIXED' && !String(out.commit || '').trim()) return 'ERROR'
  return verdict
}

async function reviewWithRetry(g, id, label, handoff) {
  let out = await reviewOnce(g, id, label, handoff)
  let verdict = reviewVerdict(out)
  if (verdict === 'ERROR') {
    log('US ' + id + ' ' + label + ' sans verdict — nouvel essai')
    out = await reviewOnce(g, id, label + '-retry', handoff)
    verdict = reviewVerdict(out)
  }
  return { out: out, verdict: verdict }
}

// Records a review on the row. Returns true when the US is done (PASS or FIXED).
function applyReview(row, out, verdict) {
  const fixes = out && typeof out === 'object' ? notesOf(out.fixes) : []
  if (fixes.length) row.reviewFixes = (row.reviewFixes || []).concat(fixes)
  // Any reviewer commit is recorded, whatever the verdict: the closing checks each one.
  if (out && typeof out === 'object' && /^[0-9a-f]{64}$/i.test(String(out.contractSha256 || '').trim())) row.contractSha256 = String(out.contractSha256).trim().toLowerCase()
  if (out && typeof out === 'object' && String(out.commit || '').trim()) row.reviewCommits = (row.reviewCommits || []).concat([String(out.commit).trim()])
  if (verdict === 'PASS' || verdict === 'FIXED') {
    const notes = issuesOf(out)
    if (notes.length) row.notes = notes
    row.review = 'PASS'
    if (verdict === 'FIXED') row.fixedByReview = true
    return true
  }
  row.review = verdict
  row.issues = issuesOf(out)
  return false
}

// Worker and fix effort. Measured on the 918 replay bench (same brief, same US, same reviewer):
// Sonnet 5.5 medium passed 4 reviews out of 4 at 1.04 USD per US on average, high 4 out of 4 at
// 1.49, low 1 out of 2. `args.workerEffort` overrides it for a run without editing the engine.
const WORKER_EFFORT = (cfg && cfg.workerEffort) || 'medium'

// Fix pass: the copied brief does not carry the "global gates once" rule.
// Measured on 913: fix US9 = 3 typechecks (340 s), fix US14 = 4 lints (294 s).
const FIX_GATE_BUDGET = '\n\nBudget gates de CETTE passe de fix : typecheck 1 fois en fin, eslint sur tes fichiers 1 fois en fin, jamais yarn lint, jamais la suite vitest. Corrige les issues ci-dessous, rien d autre.'

function handoffOf(usOut, review) {
  const parts = []
  if (usOut && typeof usOut === 'object') {
    if (usOut.commit) parts.push('Commit du worker : ' + usOut.commit + '. Commence par `git show --stat ' + usOut.commit + '`.')
    if (Array.isArray(usOut.filesTouched) && usOut.filesTouched.length) parts.push('Fichiers touches par le worker :\n' + usOut.filesTouched.map(function (f) { return '- ' + f }).join('\n'))
    if (usOut.summary) parts.push('Resume du worker : ' + usOut.summary)
    if (Array.isArray(usOut.designConformance) && usOut.designConformance.length) {
      parts.push('Conformite design declaree par le worker :\n' + usOut.designConformance.map(function (d) {
        return '- ' + d.anchor + ' ' + d.status + (Array.isArray(d.gaps) && d.gaps.length ? ' : ' + d.gaps.join(' ; ') : '')
      }).join('\n'))
    }
    if (Array.isArray(usOut.facts) && usOut.facts.length) parts.push('Faits etablis par le worker :\n' + usOut.facts.map(function (f) { return '- ' + f.fact + ' (source : ' + f.source + ')' }).join('\n'))
  }
  // The reviewer may have fixed part of the gaps before failing on the rest.
  const fixes = review && typeof review === 'object' ? notesOf(review.fixes) : []
  if (fixes.length) parts.push('Deja corrige par le reviewer' + (review.commit ? ' (commit ' + review.commit + ')' : '') + ', ne le refais pas :\n' + formatNotes(fixes))
  if (!parts.length) return ''
  return '\n\n## Passation du worker — ne refais pas sa recon\n' + parts.join('\n\n') + '\nLis d abord les fichiers cites par les issues. Ne relis pas recon.md en entier.'
}

// Runs one US: worker -> review (retried once) -> fix if the reviewer asks for one -> review2.
// row.halt is set whenever the next US must not start.
async function runUs(g) {
  const id = g.id || g.usId || '?'
  const prompt = g.prompt || g.workerPrompt || ''
  const fixPrompt = g.fixPrompt || prompt
  const row = { id: id, review: null, fixed: false }
  if (g.root) row.root = String(g.root)
  if (!prompt) {
    log('US ' + id + ' SKIP prompt vide')
    row.skipped = true
    return row
  }

  log('US ' + id + ' Sonnet start')
  const usOut = await agent(prompt, {
    label: 'us:' + id,
    phase: 'US',
    model: 'sonnet',
    effort: WORKER_EFFORT,
    agentType: 'sk-worker',
    schema: US_SCHEMA,
  })
  log('US ' + id + ' Sonnet end')
  row.facts = (usOut && typeof usOut === 'object' && Array.isArray(usOut.facts)) ? usOut.facts : []
  if (usOut && typeof usOut === 'object') {
    if (usOut.commit) row.commit = String(usOut.commit)
    if (Array.isArray(usOut.filesTouched)) row.filesTouched = usOut.filesTouched
    if (Array.isArray(usOut.designConformance)) row.designConformance = usOut.designConformance
  }
  if (row.facts.length) log('US ' + id + ' facts ' + row.facts.length)

  if (usOut == null) {
    row.error = 'worker'
    row.halt = true
    log('US ' + id + ' worker sans sortie (erreur) — arret')
    return row
  }
  if (workerStopped(usOut)) {
    row.stopped = true
    row.reason = reasonOf(usOut)
    row.halt = true
    log('US ' + id + ' worker STOP (' + row.reason + ') — arret')
    return row
  }

  if (!g.reviewPrompt) {
    row.review = 'FAIL'
    row.halt = true
    log('US ' + id + ' sans reviewPrompt — arret')
    return row
  }

  log('US ' + id + ' review start')
  const first = await reviewWithRetry(g, id, 'review', reviewHandoffOf(usOut))
  log('US ' + id + ' review ' + first.verdict)
  if (first.verdict === 'ERROR') {
    row.review = 'ERROR'
    row.error = 'review'
    row.halt = true
    return row
  }
  if (applyReview(row, first.out, first.verdict)) return row
  if (row.review === 'ESCALATE') {
    row.escalated = true
    row.halt = true
    log('US ' + id + ' review ESCALATE — arbitrage humain, pas de fix')
    return row
  }

  // Without g.fixPrompt (_shared/us-fix.md filled by /sk-impl) the fix gets the whole worker
  // brief, which orders a full recon.md read: 916 US21, 11.8 min before its first write.
  if (!g.fixPrompt) log('US ' + id + ' fixPrompt absent : brief worker reutilise pour le fix')
  log('US ' + id + ' fix start')
  const fixBrief = fixPrompt + FIX_GATE_BUDGET + handoffOf(usOut, first.out) + '\n\nReprise apres review FAIL:\n' + formatNotes(row.issues)
  const fixOnce = function (label) {
    return agent(fixBrief, { label: label + ':' + id, phase: 'US', model: 'sonnet', effort: WORKER_EFFORT, agentType: 'sk-worker', schema: US_SCHEMA })
  }
  // A fix agent that dies (null) is retried once, like a review; a real STOP is not.
  let fixOut = await fixOnce('fix')
  if (fixOut == null) {
    log('US ' + id + ' fix sans sortie (erreur) — nouvel essai')
    fixOut = await fixOnce('fix-retry')
  }
  row.fixed = true
  if (fixOut && typeof fixOut === 'object' && fixOut.commit) row.fixCommit = String(fixOut.commit)
  // What the fix proved (a way the worker thought closed) must reach recon.md,
  // or the next US gives up on the same false fact (916: US15 fact, US24 fix).
  if (fixOut && typeof fixOut === 'object' && Array.isArray(fixOut.facts) && fixOut.facts.length) {
    row.facts = row.facts.concat(fixOut.facts)
    log('US ' + id + ' fix facts ' + fixOut.facts.length)
  }
  if (workerStopped(fixOut)) {
    row.fixStopped = true
    row.fixReason = reasonOf(fixOut)
    row.halt = true
    log('US ' + id + ' fix STOP (' + row.fixReason + ') — pas de review2, arret')
    return row
  }

  // The review2 checks the first review's issues one by one instead of redoing the whole grid
  // blind: 14 review2 out of 38 failed, half of them on points the first review never raised.
  const firstIssues = row.issues.length ? '\n\n## Issues de la premiere revue — verifie chacune, puis le reste\n' + formatNotes(row.issues) : ''
  const second = await reviewWithRetry(g, id, 'review2', reviewHandoffOf(fixOut) + firstIssues)
  log('US ' + id + ' review2 ' + second.verdict)
  if (second.verdict === 'ERROR') {
    row.review = 'ERROR'
    row.error = 'review2'
    row.halt = true
    return row
  }
  if (applyReview(row, second.out, second.verdict)) return row
  row.halt = true
  if (row.review === 'ESCALATE') {
    row.escalated = true
    log('US ' + id + ' review2 ESCALATE — arret')
  } else {
    row.review2Fail = true
    log('US ' + id + ' review2 FAIL — arret')
  }
  return row
}

function workerKo(row) {
  if (!row) return true
  if (row.skipped) return true
  return !!(row.halt || row.review !== 'PASS')
}

// A group with a worker brief but no review brief would deliver an unreviewed US. Checked
// before the first agent, not after the worker: 917 sent 8 groups out of 10 without one,
// two runs halted after paying their worker and US8 was delivered without any review.
function groupsWithoutReview(list) {
  return list.filter(function (g) { return g && (g.prompt || g.workerPrompt) && !g.reviewPrompt }).map(function (g) { return g.id || g.usId || '?' })
}
// ---- END shared-review-fix ----

const HASH_SCHEMA = {
  type: 'object',
  required: ['sha256'],
  properties: { sha256: { type: 'string' } },
}

async function readHash(label) {
  const p = cfg.hashPrompt
  if (!p) return null
  const out = await agent(p, {
    label: label,
    phase: 'Review',
    model: 'sonnet',
    effort: 'low',
    schema: HASH_SCHEMA,
  })
  if (!out || typeof out !== 'object') return null
  return String(out.sha256 || '')
}

const noReview = groupsWithoutReview([barrier].concat(parallelGroups).filter(Boolean))
if (noReview.length) {
  log('groupes sans reviewPrompt : ' + noReview.join(', ') + ' — aucun agent lance')
  return ({ ok: false, error: 'args', missingReviewPrompt: noReview, barrier: null, parallel: [], stopped: true, frozenHash: null })
}

let barrierResult = null
if (barrier) {
  log('barrier ' + (barrier.id || '?') + ' start')
  barrierResult = await runUs(barrier)
  log('barrier ' + (barrier.id || '?') + ' end')
}

let parallelResults = []
let ok = true
let stopped = false
let frozenHash = null
// No barrier: the contract was frozen by the prep, the parent passes its hash and recomputes it
// after the run. Two agents paid for one sha256 otherwise (918: hash:after-barrier, hash:after-parallel).
const parentChecksHash = !barrier && !!cfg.expectedHash
if (!barrier && parallelGroups.length === 0) {
  log('rien a executer')
  ok = false
  stopped = true
} else if (barrier && workerKo(barrierResult)) {
  log('barrier ko — pas de parallel')
  ok = false
  stopped = true
} else {
  // The barrier reviewer measured the contract (check 9): its sha256 is the freeze. A dedicated
  // hash agent is paid only when that review did not return one.
  frozenHash = parentChecksHash ? String(cfg.expectedHash)
    : (barrierResult && barrierResult.contractSha256) ? barrierResult.contractSha256
    : await readHash('hash:after-barrier')
  if (barrierResult && barrierResult.contractSha256) log('freeze du contrat lu sur la revue de la barriere')
  if (collidingRoots(parallelGroups)) {
    log('meme racine — fan-out refuse, sequentiel')
    for (let i = 0; i < parallelGroups.length; i++) {
      parallelResults.push(await runUs(parallelGroups[i]))
    }
  } else {
    parallelResults = await fanOut(parallelGroups.map(function (g) { return function () { return runUs(g) } }))
  }
  if (parallelResults.some(workerKo)) {
    ok = false
    stopped = true
    log('parallel worker ko — ok=false')
  }
  if (ok && cfg.hashPrompt && !parentChecksHash) {
    // Each parallel reviewer re-measured the contract after its worker: when they all did, no
    // hash agent is needed; any reviewer that did not makes the engine pay one.
    const measured = parallelResults.map(function (r) { return r && r.contractSha256 }).filter(Boolean)
    const allMeasured = measured.length === parallelResults.length && measured.length > 0
    const drift = allMeasured ? measured.find(function (h) { return h !== frozenHash }) : null
    const later = allMeasured ? (drift || frozenHash) : await readHash('hash:after-parallel')
    // An unreadable hash proves nothing: never read it as "no drift".
    if (!frozenHash || !later) {
      ok = false
      stopped = true
      log('contract hash illisible (' + (frozenHash ? 'apres' : 'avant') + ' le fan-out) — STOP')
    } else if (frozenHash !== later) {
      ok = false
      stopped = true
      log('contract hash drift — STOP')
    }
  }
}

return ({ ok: !cfg.__parseError && ok, barrier: barrierResult, parallel: parallelResults, stopped: stopped || !!cfg.__parseError, frozenHash: frozenHash, hashCheckedBy: parentChecksHash ? 'parent' : 'workflow' })
