// Showcase: replays a recorded run of Aegis's own attack search on the small materials ontology.
// Nothing is searched in the browser: every score, tree, and lock choice is read from walkthrough-data.json,
// written by experiments/walkthrough/trace.py in the Aegis repository and exported by walkthrough_data.py.
(function () {
const root = document.getElementById("walk");
if (!root) return;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  if (tag === "button") el.type = "button";
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
const f2 = (x) => (x == null ? "–" : Number(x).toFixed(2));
fetch("walkthrough-data.json").then((r) => r.json()).then(start).catch(() => { root.textContent = "The recorded run could not be loaded."; });

function start(W) {
const NS = "http://www.w3.org/2000/svg";
const S = (tag, attrs = {}, ...kids) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  for (const kid of kids.flat()) if (kid != null) n.append(kid.nodeType ? kid : document.createTextNode(kid));
  return n;
};
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const short = (s, n = 30) => { const t = s.replace(/remove /g, "− ").replace(/add /g, "+ ").replace(/ ⊑ /g, "⊑").replace(/ ; /g, "  "); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const lastUnit = (parent, key) => (parent === "root" ? key : key.slice(parent.length + 3));
const HONEST = W.honest;

// ---------- the ontology as a graph ----------
const POS = { Material: [205, 52], Metal: [92, 160], Polymer: [318, 160], Alloy: [92, 258], Steel: [92, 350], Temperature: [505, 52], MeltingPoint: [505, 208], Temperaturee: [552, 130] };
const R = 22;
const relKey = (r) => r.join("|");
const relLabel = (r) => (r[1] === "subClassOf" ? `${r[0]} ⊑ ${r[2]}` : `${r[0]} ${r[1]} ${r[2]}`);
const allRels = new Map(W.ontology.relations.map((r) => [relKey(r), r]));
const allConcepts = new Set(W.ontology.concepts);
for (const s of Object.values(W.states)) { s.new.forEach((r) => allRels.set(relKey(r), r)); s.new_concepts.forEach((c) => allConcepts.add(c)); }
const posOf = (c) => POS[c] || [560, 250 + (c.length % 5) * 16];
const idOfLabel = new Map([...allRels].map(([k, r]) => [relLabel(r), k]));

function view(key) {
  const s = W.states[key] || W.states[HONEST];
  const concepts = new Set(W.ontology.concepts.filter((c) => !s.gone_concepts.includes(c)));
  s.new_concepts.forEach((c) => concepts.add(c));
  const rels = new Set(W.ontology.relations.map(relKey).filter((k) => !s.gone.some((r) => relKey(r) === k)));
  s.new.forEach((r) => rels.add(relKey(r)));
  return { s, concepts, rels };
}

function makeGraph(el) {
  const svg = S("svg", { viewBox: "0 0 600 392", role: "img", "aria-label": "The ontology graph" });
  const glow = (id, color, sd) => S("filter", { id, x: "-60%", y: "-60%", width: "220%", height: "220%" },
    S("feGaussianBlur", { in: "SourceGraphic", stdDeviation: sd, result: "b" }), S("feFlood", { style: `flood-color:${color}`, "flood-opacity": ".35" }),
    S("feComposite", { in2: "b", operator: "in", result: "c" }), S("feMerge", {}, S("feMergeNode", { in: "c" }), S("feMergeNode", { in: "SourceGraphic" })));
  svg.append(S("defs", {},
    glow("glow-red", "var(--s-bad)", 4), glow("glow-teal", "var(--s-hit)", 4), glow("glow-blue", "var(--s-seed)", 5), glow("glow-orange", "var(--s-spur)", 4), glow("glow-gold", "var(--s-gold)", 4),
    S("radialGradient", { id: "halo" }, S("stop", { offset: "0", style: "stop-color:var(--s-bad)", "stop-opacity": ".55" }), S("stop", { offset: "1", style: "stop-color:var(--s-bad)", "stop-opacity": "0" })),
    S("marker", { id: "arr", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto" }, S("path", { d: "M0 1 L9 5 L0 9 z", fill: "context-stroke" }))));
  const edgeLayer = S("g"), nodeLayer = S("g");
  svg.append(edgeLayer, nodeLayer);
  const edges = new Map(), nodes = new Map();
  for (const [k, r] of allRels) {
    const a = posOf(r[0]), b = posOf(r[2]), dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const bend = (r[1] === "subClassOf" ? 0.07 : 0.2) * len * (r[0] < r[2] ? 1 : -1);
    const p0 = [a[0] + ux * R, a[1] + uy * R], p2 = [b[0] - ux * (R + 6), b[1] - uy * (R + 6)];
    const c = [(p0[0] + p2[0]) / 2 - uy * bend, (p0[1] + p2[1]) / 2 + ux * bend], mid = [(p0[0] + 2 * c[0] + p2[0]) / 4, (p0[1] + 2 * c[1] + p2[1]) / 4];
    const path = S("path", { class: "g-edge off" + (r[1] === "subClassOf" ? "" : " prop"), d: `M${p0} Q${c} ${p2}`, "marker-end": "url(#arr)", pathLength: 1 });
    const x = S("g", { class: "g-x", opacity: 0 }, S("path", { d: `M${mid[0] - 6} ${mid[1] - 6} l12 12 M${mid[0] + 6} ${mid[1] - 6} l-12 12`, class: "g-x" }));
    const lock = S("g", { class: "g-lock", opacity: 0, transform: `translate(${mid[0]} ${mid[1]})` },
      S("circle", { r: 11 }), S("path", { d: "M-3.5 -1 v-2.5 a3.5 3.5 0 0 1 7 0 v2.5" }), S("rect", { x: -5, y: -1, width: 10, height: 7, rx: 1.5 }));
    edgeLayer.append(path, x, lock);
    edges.set(k, { path, x, lock });
  }
  for (const c of allConcepts) {
    const [px, py] = posOf(c);
    const halo = S("circle", { class: "g-halo", r: R, cx: 0, cy: 0, fill: "url(#halo)" }), body = S("circle", { class: "body", r: R });
    const tag = S("text", { y: 0, "font-size": 11, "font-weight": 600 });
    const g = S("g", { class: "g-node off", transform: `translate(${px} ${py})` }, halo, body, tag, S("text", { y: R + 14 }, c));
    nodeLayer.append(g);
    nodes.set(c, { g, halo, tag });
  }
  el.replaceChildren(svg);
  // spec: {key, glow:{concept: 0..1}, edgeGlow:{label: 0..1}, locked:[label], hot:[label], tags:{concept: text}}
  return (spec) => {
    const v = view(spec.key), s = v.s, q = W.queries;
    for (const [k, e] of edges) {
      const here = v.rels.has(k), honest = allRels.has(k) && W.ontology.relations.some((r) => relKey(r) === k);
      const label = relLabel(allRels.get(k));
      const status = here ? (honest ? "on" : "new") : honest ? "gone" : "off";
      const hot = (spec.hot || []).includes(label), locked = (spec.locked || []).includes(label), eg = (spec.edgeGlow || {})[label] || 0;
      e.path.setAttribute("class", `g-edge ${status === "on" ? "" : status}${e.path.classList.contains("prop") ? " prop" : ""}${hot ? " hot" : ""}${locked ? " locked" : ""}`);
      e.path.style.strokeWidth = eg ? 1.6 + eg * 3 : "";
      if (eg && status === "on") { e.path.style.stroke = "var(--s-spur)"; } else e.path.style.stroke = "";
      e.x.setAttribute("opacity", status === "gone" ? 1 : 0);
      e.lock.setAttribute("opacity", locked ? 1 : 0);
    }
    for (const [c, n] of nodes) {
      const here = v.concepts.has(c), honest = W.ontology.concepts.includes(c);
      let cls = "g-node " + (here ? (honest ? "" : "new") : honest ? "gone" : "off");
      if (here) {
        const seed = q.find((x) => x.seed === c);
        const inAns = q.find((x) => s.answers[x.q].includes(c)), gold = q.find((x) => x.gold.includes(c));
        if (seed) cls += " seed";
        else if (inAns && gold) cls += " hit";
        else if (inAns) cls += " spur";
        else if (gold) cls += " miss";
      }
      n.g.setAttribute("class", cls);
      const gl = (spec.glow || {})[c] || 0;
      n.halo.setAttribute("r", R + 8 + gl * 26);
      n.halo.style.opacity = gl ? 0.25 + gl * 0.75 : 0;
      n.tag.textContent = (spec.tags || {})[c] || "";
    }
    return s;
  };
}

// ---------- the search tree ----------
const heat = (t) => `color-mix(in srgb, var(--s-bad) ${Math.round(Math.min(1, Math.max(0, t)) * 100)}%, var(--s-low))`;
function makeTree(el) {
  const svg = S("svg", { viewBox: "0 0 640 392", role: "img", "aria-label": "The search tree" });
  const edgeLayer = S("g"), nodeLayer = S("g"), over = S("g");
  svg.append(edgeLayer, nodeLayer, over);
  el.replaceChildren(svg);
  const nodes = new Map(), edges = new Map();
  return (tree, o) => {
    // flatten and lay out: x by depth, y by leaf order
    const flat = [];
    let leaf = 0;
    const walk = (n, depth, parent) => {
      const f = { n, depth, parent, id: parent === null ? "root" : n.label, y: 0, hidden: 0 };
      flat.push(f);
      let shown = n.children;
      if (depth >= 1 && shown.length > 2) {
        const must = (c) => o.sel.includes(c.label) || o.fresh === c.label;
        const top = [...shown].sort((a, b) => b.visits - a.visits || b.harm - a.harm).slice(0, 2);
        shown = shown.filter((c) => top.includes(c) || must(c));
        f.hidden = n.children.length - shown.length;
      }
      const kids = shown.map((c) => walk(c, depth + 1, f.id));
      f.y = kids.length ? (kids[0].y + kids[kids.length - 1].y) / 2 : leaf++;
      return f;
    };
    walk(tree, 0, null);
    const space = Math.min(34, 330 / Math.max(leaf, 1)), top = 196 - ((leaf - 1) * space) / 2;
    const pos = new Map(flat.map((f) => [f.id, [46 + f.depth * 200, top + f.y * space]]));
    const radius = (n) => Math.min(21, 7 + 3.4 * Math.sqrt(n.visits));
    const seen = new Set();
    for (const f of flat) {
      seen.add(f.id);
      const [x, y] = pos.get(f.id), n = f.n, sel = o.sel.includes(f.id), fresh = o.fresh === f.id;
      let nd = nodes.get(f.id);
      if (!nd) {
        const c = S("circle", { r: 4 }), t = S("text", { x: 0, y: 0 }), cnt = S("text", { class: "n" });
        const g = S("g", { class: "t-node", style: `transform:translate(${x}px,${y}px)` }, S("title", {}, f.id), c, t, cnt);
        nodeLayer.append(g);
        nd = { g, c, t, cnt };
        nodes.set(f.id, nd);
      }
      nd.g.style.transform = `translate(${x}px,${y}px)`;
      nd.g.style.opacity = 1;
      nd.g.setAttribute("class", `t-node${sel ? " sel" : ""}${fresh ? " fresh" : ""}${n.done ? " done" : ""}`);
      const r = f.parent === null ? 11 : radius(n);
      nd.c.setAttribute("r", r);
      nd.c.style.fill = f.parent === null ? "var(--s-seed)" : heat(n.visits ? n.total / n.visits : n.harm);
      nd.t.textContent = f.parent === null ? "" : short(lastUnit(f.parent, f.id), f.hidden ? 20 : 34) + (f.hidden ? `   (+${f.hidden} more)` : "");
      nd.t.setAttribute("x", r + 6);
      nd.cnt.textContent = f.parent !== null && r >= 12 ? n.visits : "";
      if (f.parent !== null) {
        let ed = edges.get(f.id);
        if (!ed) { ed = S("path", { class: "t-edge" }); edgeLayer.append(ed); edges.set(f.id, ed); }
        const [px, py] = pos.get(f.parent), mx = (px + x) / 2;
        ed.setAttribute("d", `M${px} ${py} C${mx} ${py} ${mx} ${y} ${x} ${y}`);
        ed.setAttribute("class", "t-edge" + (sel ? " sel" : ""));
        ed.style.strokeWidth = 1.2 + Math.min(5, Math.sqrt(n.visits) * 1.2);
      }
    }
    for (const [id, nd] of nodes) if (!seen.has(id)) { nd.g.remove(); nodes.delete(id); edges.get(id)?.remove(); edges.delete(id); }
    over.replaceChildren();
    for (const [id, u] of Object.entries(o.ucb || {})) {
      const p = pos.get(id);
      if (p) over.append(S("text", { class: "t-ucb", x: p[0] - 4, y: p[1] - 15, "text-anchor": "start" }, "UCB " + u));
    }
    if (o.roll && pos.get(o.roll.from)) {
      const [x, y] = pos.get(o.roll.from), x2 = Math.min(x + 150, 600), y2 = y + 34;
      over.append(S("path", { class: "t-roll", d: `M${x} ${y} C${x + 60} ${y} ${x2 - 60} ${y2} ${x2} ${y2}` }),
        S("path", { class: "t-ghost", d: `M${x2} ${y2 - 7} l7 7 l-7 7 l-7 -7 z` }), S("text", { class: "t-harm", x: x2 + 11, y: y2 + 4 }, "harm " + f2(o.roll.harm)));
    }
    over.append(S("text", { class: "t-hud", x: 6, y: 14 }, o.hud || ""));
  };
}

// ---------- left-hand panels ----------
const barsPanel = (rows, note) => h("div", {}, h("div", { class: "p-bars" }, rows.map((r, i) => {
  const row = h("div", { class: "p-row " + (r.cls || ""), style: `animation-delay:${Math.min(i, 24) * 30}ms` }, h("span", {}, r.label), h("i"), h("b", {}, r.text ?? f2(r.value)));
  row.children[1].style.setProperty("--w", Math.max(1, Math.min(100, (r.value / (r.max || 1)) * 100)) + "%");
  return row;
})), note ? h("div", { class: "p-note", html: note }) : null);

// ---------- the four acts ----------
const Q = W.queries, qShort = (i) => `Q${i + 1}`;
const fmtChain = (steps) => (steps.length ? steps.map((s) => short(s, 60)).join(", ") : "()");
const gaugeOf = (key) => W.states[key] || W.states[HONEST];

function areaAct() {
  const cs = [...W.impact.concepts].sort((a, b) => a.name.localeCompare(b.name)), rs = [...W.impact.relations].sort((a, b) => a.name.localeCompare(b.name));
  const maxC = Math.max(...cs.map((c) => c.delta)), maxR = Math.max(...rs.map((c) => c.delta));
  const steps = [];
  steps.push({ tag: "workload", line: [0, 1], text: `Two questions are put to the ontology, <b>${esc(Q[0].q)}</b> and <b>${esc(Q[1].q)}</b>. Each is answered by walking <code>subClassOf</code> down from a seed. Teal nodes are correct answers; the blue nodes are the seeds.`,
    graph: { key: HONEST, tags: { [Q[0].seed]: "Q1", [Q[1].seed]: "Q2" } }, left: { rows: Q.map((q, i) => ({ label: `${qShort(i)} gold`, value: 1, text: q.gold.length + " answers", cls: "pick" })), note: Q.map((q, i) => `<b>${qShort(i)}</b> seed ${q.seed}: ${q.gold.join(", ")}`).join("<br>") }, vars: [["workload", "2 queries"], ["P(O)", "1.00"]] });
  Q.forEach((q, i) => steps.push({ tag: "reach", line: [2], text: `<b>What ${qShort(i)} can reach.</b> Only these concepts are connected to the seed ${esc(q.seed)}: ${esc(q.scope.join(", "))}. Everything else has Δ = 0 for this question, since no path joins it to the answer, so it never needs scoring.`,
    graph: { key: HONEST, glow: Object.fromEntries(q.scope.map((c) => [c, 0.55])), tags: { [q.seed]: qShort(i) } }, left: { rows: q.scope.map((c) => ({ label: c, value: 1, text: "in scope" })), note: "The retrieval scope of the query." }, vars: [["seed", q.seed], ["scope", q.scope.length + " of " + W.ontology.concepts.length + " concepts"]] }));
  const glow = {};
  cs.forEach((c, i) => {
    glow[c.name] = c.delta / maxC;
    steps.push({ tag: "scan concept", line: [3, 4], text: `Take <b>${esc(c.name)}</b> out and ask both questions again. Mean F1 falls from 1.00 to ${f2(1 - c.delta)}, so <b>Δ = ${f2(c.delta)}</b>${c.delta ? "" : ". Nothing depended on it"}.`,
      graph: { key: c.key, glow: { ...glow, [c.name]: 0 } , tags: {} }, left: { rows: cs.slice(0, i + 1).map((x, j) => ({ label: x.name, value: x.delta, text: "Δ " + f2(x.delta), cls: j === i ? "cur" : "" })), note: "Δc = P(O) − P(O without c)" },
      vars: [["c", c.name], ["P(O − c)", f2(1 - c.delta)], ["Δc", f2(c.delta)]] });
  });
  const eg = {};
  rs.forEach((r, i) => {
    eg[r.name] = r.delta / (maxR || 1);
    steps.push({ tag: "scan relation", line: [5, 6], text: `Cut the single link <b>${esc(r.name)}</b>. Mean F1 falls to ${f2(1 - r.delta)}: <b>Δ = ${f2(r.delta)}</b>.`,
      graph: { key: r.key, glow, edgeGlow: Object.fromEntries(Object.entries(eg).filter(([k]) => k !== r.name)) }, left: { rows: rs.slice(0, i + 1).map((x, j) => ({ label: x.name, value: x.delta, text: "Δ " + f2(x.delta), cls: j === i ? "cur" : "" })), note: "Δr = P(O) − P(O without r)" },
      vars: [["r", r.name], ["P(O − r)", f2(1 - r.delta)], ["Δr", f2(r.delta)]] });
  });
  const ranked = [...W.units].sort((a, b) => b.harm - a.harm).slice(0, 14);
  steps.push({ tag: "affected area", cls: "good", line: [7, 8], text: `<b>The affected area is the glowing part.</b> It is where Δ > 0: the few elements the answers lean on. Ranked by Δ, they become the attacker's building blocks, <b>${W.units.length} units</b>: a removal, a rewire (remove then re-add elsewhere), or a flood of look-alikes. Bars show each unit's harm on its own.`,
    graph: { key: HONEST, glow, edgeGlow: eg }, left: { rows: ranked.map((u) => ({ label: short(u.label, 44), value: u.harm, cls: u.harm >= 0.6 ? "cur" : "" })), note: "Top 14 of the units, by harm when applied alone." }, vars: [["units", W.units.length], ["best alone", f2(ranked[0].harm)]] });
  return { name: "1 · Affected area", code: [
    "def affected_area(score, onto, seeds):",
    "    base = score(onto)  # mean answer F1",
    "    scope = onto.reachable(seeds)  # outside it, every Δ is 0",
    "    for c in onto.concepts:",
    "        delta[c] = base - score(onto.without_concept(c))",
    "    for r in onto.relations:",
    "        delta[r] = base - score(onto.without_relation(r))",
    "    top = sorted(delta, key=delta.get, reverse=True)",
    "    return candidate_units(onto, top)" ], steps };
}

function greedyAct() {
  const unit = (i) => W.units[i], steps = [];
  W.greedy.rounds.forEach((r, ri) => {
    const rows = [...r.options].sort((a, b) => b.harm - a.harm).map((o) => ({ ...o, label: short(unit(o.unit).label, 44) }));
    const chainTxt = fmtChain(r.chain_before);
    steps.push({ tag: "greedy · try all", line: [2, 3], text: `<b>Round ${ri + 1}.</b> The chain so far is ${esc(chainTxt)}. Score the chain with each of the ${rows.length} units that still fit added, one by one.`,
      graph: { key: ri ? W.greedy.rounds[ri - 1].picked_key : HONEST }, left: { rows: rows.map((o) => ({ label: o.label, value: o.harm })), note: `${rows.length} evaluations this round.` }, vars: [["chain", chainTxt], ["best so far", f2(r.best_before)], ["tried", rows.length]] });
    const take = r.picked !== null;
    steps.push({ tag: take ? "greedy · keep best" : "greedy · stop", cls: take ? "" : "attack", line: take ? [4, 5, 6] : [4, 5], text: take ? `The best is <b>${esc(unit(r.picked).label)}</b> with harm <b>${f2(r.picked_harm)}</b>, up from ${f2(r.best_before)}. Greedy keeps it.` : `The best option scores ${f2(r.picked_harm)}, no better than ${f2(r.best_before)}. Greedy stops.`,
      graph: { key: take ? r.picked_key : (ri ? W.greedy.rounds[ri - 1].picked_key : HONEST), hot: [] }, left: { rows: rows.map((o) => ({ label: o.label, value: o.harm, cls: take && o.unit === r.picked ? "pick" : "dim" })), note: take ? "" : "No unit beats the current chain." }, vars: [["chain", take ? fmtChain([...r.chain_before, unit(r.picked).label]) : chainTxt], ["best so far", f2(r.picked_harm > r.best_before ? r.picked_harm : r.best_before)]] });
  });
  const fin = W.greedy.final;
  steps.push({ tag: "greedy · result", cls: "attack", line: [7], text: `<b>Greedy ends at harm ${f2(fin.harm)}.</b> Every single edit is weak on its own, so a method that adds the best edit each time cannot see that two weak edits together are far worse. The bandit, next, finds ${f2(W.uct.final.harm)}.`,
    graph: { key: fin.key }, left: { rows: [{ label: "Greedy", value: fin.harm, cls: "cur" }, { label: "Beam", value: W.beam.harm }, { label: "Bandit (UCT)", value: W.uct.final.harm, cls: "pick" }], note: "Same ontology, same budget of " + W.budget + " edits." }, vars: [["chain", fmtChain(fin.steps)], ["harm", f2(fin.harm)]] });
  return { name: "2 · Greedy", code: [
    "def greedy(harm, onto, units, budget):",
    "    chain, best = (), 0.0",
    "    while True:",
    "        options = [extend(chain, u) for u in units if fits(chain, u)]",
    "        nxt, score = max(options, key=harm)",
    "        if score <= best: break",
    "        chain, best = nxt, score",
    "    return chain" ], steps };
}

function uctAct() {
  const U = W.uct, its = U.iterations, steps = [];
  const empty = { label: "root", visits: 0, total: 0, harm: 0, done: false, children: [] };
  const clone = (t) => JSON.parse(JSON.stringify(t));
  const find = (t, id) => (t.label === id || (id === "root" && t.label === "root") ? t : t.children.map((c) => find(c, id)).find(Boolean));
  const hudOf = (e, best) => `evaluations ${e} / ${U.evaluations}   ·   best harm so far ${f2(best)}`;
  steps.push({ tag: "bandit", line: [0, 1], text: `<b>The bandit.</b> Each node of the tree is a chain of edits, and the units that could come next are its arms. The bandit spends a budget of <b>${U.evaluations} harm evaluations</b> where earlier chains hurt most, and still tries new arms. Node size is visits; colour is mean harm, from blue to red.`,
    tree: { tree: empty, sel: [], hud: hudOf(0, 0) }, graph: { key: HONEST }, vars: [["budget", U.evaluations + " evaluations"], ["c", U.c], ["edits", "≤ " + W.budget]] });
  its.forEach((it, i) => {
    const prev = i ? its[i - 1].tree : empty, prevBest = i ? its[i - 1].best.harm : 0, sel = it.selected;
    const parentId = sel.length ? sel[sel.length - 1].chain.key : "root", ids = sel.map((s) => s.chain.key);
    const ucbs = Object.fromEntries(sel.map((s) => [s.chain.key, s.ucb.toFixed(2)]));
    const parentNode = find(prev, parentId);
    const withNew = () => { const t = clone(prev); if (it.expanded) find(t, parentId).children.push({ label: it.expanded.chain.key, visits: 0, total: 0, harm: it.expanded.harm, done: false, children: [] }); return t; };
    const n = `Iteration ${i + 1}`;
    steps.push({ tag: "1 · select", line: [3, 4, 5], text: sel.length
      ? `<b>${n}. Select.</b> Walk down from the root. At each node take the child with the highest <b>UCB = mean + ${U.c}·√(ln N / n)</b>: ${sel.map((s) => `${esc(short(lastUnit("root", s.chain.key), 40))} (UCB ${s.ucb.toFixed(2)}, mean ${s.mean.toFixed(2)})`).join(", then ")}. This node still has units untried, so the walk stops here.`
      : `<b>${n}. Select.</b> The root has no child worth descending into yet, or room to open a new arm first, so the walk stops at the root.`,
      tree: { tree: prev, sel: ["root", ...ids], ucb: ucbs, hud: hudOf(i ? its[i - 1].evaluations : 0, prevBest) }, graph: { key: sel.length ? parentId : HONEST }, vars: [["node", sel.length ? short(parentId, 60) : "root"], ["visits N", parentNode ? parentNode.visits : 0], ["path length", sel.length]], iter: i });
    if (it.expanded) steps.push({ tag: "2 · expand", cls: "attack", line: [6], text: `<b>${n}. Expand.</b> Open the next untried unit and score the new chain: <b>${esc(short(it.expanded.chain.key, 90))}</b> does harm <b>${f2(it.expanded.harm)}</b>.`,
      tree: { tree: withNew(), sel: ["root", ...ids], fresh: it.expanded.chain.key, hud: hudOf(it.evaluations - (it.rollout && it.rollout.chain.key !== it.expanded.chain.key ? 1 : 0), prevBest) }, graph: { key: it.expanded.chain.key }, vars: [["new chain", short(it.expanded.chain.key, 60)], ["harm", f2(it.expanded.harm)]], iter: i });
    if (it.rollout) steps.push({ tag: "3 · rollout", cls: "attack", line: [7], text: `<b>${n}. Roll out.</b> Finish the chain with random units, ${it.rollout.chain.key === (it.expanded && it.expanded.chain.key) ? "though none fit" : "scoring only where it ends"}: <b>${esc(short(it.rollout.chain.key, 90))}</b> does harm <b>${f2(it.rollout.harm)}</b>.`,
      tree: { tree: withNew(), sel: ["root", ...ids], fresh: it.expanded && it.expanded.chain.key, roll: { from: it.expanded ? it.expanded.chain.key : parentId, harm: it.rollout.harm }, hud: hudOf(it.evaluations, prevBest) }, graph: { key: it.rollout.chain.key }, vars: [["end chain", short(it.rollout.chain.key, 60)], ["harm", f2(it.rollout.harm)]], iter: i });
    const gain = it.best.harm > prevBest + 1e-9;
    steps.push({ tag: "4 · backpropagate", cls: "good", line: [8, 9], text: `<b>${n}. Backpropagate.</b> The reward is the largest harm on the path, <b>${f2(it.reward)}</b>, since an attacker may stop at any prefix. Every node on the path gains a visit and the reward.${gain ? ` <b>New best chain: harm ${f2(it.best.harm)}.</b>` : ""}`,
      tree: { tree: it.tree, sel: ["root", ...ids, ...(it.expanded ? [it.expanded.chain.key] : [])], hud: hudOf(it.evaluations, it.best.harm) }, graph: { key: it.best.chain.key }, vars: [["reward", f2(it.reward)], ["best chain", short(it.best.chain.key, 60)], ["best harm", f2(it.best.harm)]], iter: i });
  });
  const last = its[its.length - 1];
  steps.push({ tag: "bandit · result", cls: "good", line: [10], text: `<b>The bandit finds harm ${f2(U.final.harm)} in ${last.evaluations} evaluations:</b> ${esc(U.final.steps.join(", then "))}. Each edit alone does only 0.50, so greedy never took the first. Greedy stopped at ${f2(W.greedy.final.harm)}, and beam search at ${f2(W.beam.harm)}.`,
    tree: { tree: last.tree, sel: [], hud: hudOf(last.evaluations, U.final.harm) }, graph: { key: U.final.key }, vars: [["chain", fmtChain(U.final.steps)], ["harm", f2(U.final.harm)]], iter: its.length - 1 });
  return { name: "3 · Bandit", code: [
    "def uct(harm, onto, units, budget, evaluations, c=0.5):",
    "    root = Node(chain=())",
    "    while search.evaluations < evaluations:",
    "        node = root",
    "        while node.is_full():  # select",
    "            node = max(node.children, key=ucb)  # mean + c·√(ln N/n)",
    "        child = node.expand(next_untried_unit)  # score it",
    "        end = rollout(child, units, budget)  # random units; score",
    "        reward = max(harm on the path)  # stop at any prefix",
    "        for n in path: n.visits += 1; n.total += reward",
    "    return best_chain_scored" ], steps };
}

function lockAct() {
  const L = W.locks, steps = [];
  steps.push({ tag: "no locks", cls: "attack", line: [0, 1], text: `<b>Defending.</b> There is room to lock only <b>${L.rounds.length} triples</b> against an attacker of ${L.attacker_cost} edits. A locked triple cannot be removed; the attempt goes to a human reviewer. The attacker's best response without locks does harm <b>${f2(L.none)}</b>.`,
    graph: { key: HONEST }, left: { rows: [{ label: "Residual harm, no locks", value: L.none, cls: "cur" }], note: "Residual harm is the harm of the attacker's best response." }, vars: [["locks", "0 of " + L.rounds.length], ["residual", f2(L.none)]] });
  const locked = [];
  L.rounds.forEach((r, i) => {
    steps.push({ tag: "attacker's best response", cls: "attack", line: [2, 3], text: `<b>Round ${i + 1}.</b> Against the locks so far${locked.length ? " (" + esc(locked.join(", ")) + ")" : ""}, the attacker's best chain is <b>${esc(r.attacker.steps.join(", then "))}</b>, with harm <b>${f2(r.attacker.harm)}</b>.`,
      graph: { key: r.attacker.key, locked: [...locked] }, left: { rows: [{ label: "Attacker's best chain", value: r.attacker.harm, cls: "cur" }], note: esc(r.attacker.steps.join(" → ")) }, vars: [["locked", locked.join(", ") || "none"], ["harm", f2(r.attacker.harm)]] });
    steps.push({ tag: "candidate locks", cls: "lock", line: [4], text: `Only the triples this chain <b>removes</b> can stop it, so those are the candidates. For each, lock it, let the attacker respond again, and read the residual harm. ${r.options.map((o) => `<b>${esc(o.triple)}</b> → ${f2(o.residual)}`).join("; ")}.`,
      graph: { key: HONEST, locked: [...locked], hot: r.options.map((o) => o.triple) }, left: { rows: r.options.map((o) => ({ label: "lock " + o.triple, value: o.residual, cls: "lockrow" })), note: "Residual harm if this triple is locked." }, vars: [["candidates", r.options.length], ["lowest residual", f2(Math.min(...r.options.map((o) => o.residual)))]] });
    locked.push(r.picked);
    steps.push({ tag: "lock", cls: "lock", line: [5], text: `<b>Lock ${esc(r.picked)}.</b> The attacker's best response now does <b>${f2(r.residual)}</b>.`,
      graph: { key: HONEST, locked: [...locked] }, left: { rows: [{ label: "Before", value: i ? L.rounds[i - 1].residual : L.none }, { label: "After this lock", value: r.residual, cls: "pick" }], note: "Residual harm." }, vars: [["locked", locked.join(", ")], ["residual", f2(r.residual)]] });
  });
  steps.push({ tag: "result", cls: "good", line: [6], text: `<b>${L.rounds.length} locks take the best attack from ${f2(L.none)} to ${f2(L.final)}.</b> Locking is a light mitigation: it does not stop every edit, it makes the worst one harder and sends it to a person.`,
    graph: { key: HONEST, locked: [...locked] }, left: { rows: [{ label: "No locks", value: L.none }, ...L.rounds.map((r, i) => ({ label: `${i + 1} lock${i ? "s" : ""}`, value: r.residual, cls: i === L.rounds.length - 1 ? "pick" : "" }))], note: "Residual harm as locks are added." }, vars: [["locked", locked.join(", ")], ["residual", f2(L.final)]] });
  return { name: "4 · Lock", code: [
    "def lock_best_response(attacker, onto, units, m):",
    "    locks = []",
    "    for _ in range(m):",
    "        best = attacker(allowed(units, locks))  # the attacker's best response",
    "        options = removed_by(best.chain, onto)  # only these triples can stop it",
    "        locks.append(min(options, key=lambda r: residual(attacker, units, [*locks, r])))",
    "    return locks" ], steps };
}

// ---------- the player ----------
const MARKUP = `
<div class="seg" id="wt-acts" role="group" aria-label="Part of the search to watch"></div>
<div class="stage">
  <div class="stage-grid">
    <div><h4 id="wt-left-title">Evaluations</h4><div id="wt-tree"></div><div id="wt-bars"></div></div>
    <div><h4>The ontology</h4><div id="wt-graph"></div>
      <div class="gauges" aria-label="Answer quality">
        <div class="gauge" id="g-q0"><svg viewBox="0 0 46 46"><circle class="trk" cx="23" cy="23" r="17"/><circle class="val" cx="23" cy="23" r="17" transform="rotate(-90 23 23)" stroke-dasharray="0 107"/></svg><div>F1, Q1<b>1.00</b></div></div>
        <div class="gauge" id="g-q1"><svg viewBox="0 0 46 46"><circle class="trk" cx="23" cy="23" r="17"/><circle class="val" cx="23" cy="23" r="17" transform="rotate(-90 23 23)" stroke-dasharray="0 107"/></svg><div>F1, Q2<b>1.00</b></div></div>
        <div class="gauge big" id="g-harm"><svg viewBox="0 0 46 46"><circle class="trk" cx="23" cy="23" r="17"/><circle class="val" cx="23" cy="23" r="17" transform="rotate(-90 23 23)" stroke-dasharray="0 107"/></svg><div>harm<b>0.00</b></div></div>
      </div></div>
  </div>
  <div class="legend-art"><span style="--c:var(--s-seed)"><i></i>seed of a question</span><span style="--c:var(--s-hit)"><i></i>correct answer</span><span style="--c:var(--s-bad)"><i></i>missing or injected</span><span style="--c:var(--s-spur)"><i></i>wrong answer</span><span style="--c:var(--s-gold)"><i></i>locked or chosen</span></div>
  <div class="caption" id="wt-caption" aria-live="polite"></div>
</div>
<div class="transport">
  <button class="btn" id="wt-iter-prev" title="Previous iteration">⏮ iteration</button>
  <button class="btn" id="wt-prev" title="Previous step (left arrow)">◀ Back</button>
  <button class="btn solid" id="wt-play" title="Play or pause (space)">▶ Play</button>
  <button class="btn" id="wt-next" title="Next step (right arrow)">Next ▶</button>
  <button class="btn" id="wt-iter-next" title="Next iteration">iteration ⏭</button>
  <input type="range" id="wt-scrub" min="0" max="1" value="0" aria-label="Step">
  <label>Speed <select id="wt-speed"><option value="slow">slow</option><option value="normal" selected>normal</option><option value="fast">fast</option></select></label>
  <span class="count" id="wt-count"></span>
</div>
`;
const acts = [areaAct(), greedyAct(), uctAct(), lockAct()];
root.className = "walk";
root.innerHTML = MARKUP;
const drawGraph = makeGraph($("#wt-graph")), drawTree = makeTree($("#wt-tree"));
const params = new URLSearchParams(location.search);
const st = { a: Math.min(acts.length - 1, +(params.get("act") || root.dataset.act) || 0), i: 0, timer: null };
st.i = Math.min(acts[st.a].steps.length - 1, +params.get("step") || 0);
const speeds = { slow: 2200, normal: 1300, fast: 450 };

function paint() {
  const act = acts[st.a], step = act.steps[st.i];
  $$("#wt-acts button").forEach((b, j) => b.setAttribute("aria-pressed", String(j === st.a)));
  const useTree = !!step.tree;
  $("#wt-left-title").textContent = useTree ? "The bandit's search tree" : act.name.slice(4) === "Affected area" ? "Impact of each element" : "Evaluations";
  $("#wt-tree").hidden = !useTree; $("#wt-bars").hidden = useTree;
  if (useTree) drawTree(step.tree.tree, { sel: step.tree.sel || [], ucb: step.tree.ucb, fresh: step.tree.fresh, roll: step.tree.roll, hud: step.tree.hud });
  else $("#wt-bars").replaceChildren(barsPanel(step.left.rows, step.left.note));
  const s = drawGraph(step.graph);
  const ring = (el, v, col) => { const c = 2 * Math.PI * 17; el.querySelector(".val").setAttribute("stroke-dasharray", `${(c * Math.max(0, v)).toFixed(1)} ${c.toFixed(1)}`); el.querySelector("b").textContent = f2(v); if (col) el.querySelector(".val").style.stroke = col; };
  Q.forEach((q, j) => ring($("#g-q" + j), s.f1[q.q], s.f1[q.q] < 0.5 ? "var(--s-bad)" : s.f1[q.q] < 1 ? "var(--s-spur)" : "var(--s-hit)"));
  ring($("#g-harm"), s.harm);
  $("#wt-caption").replaceChildren(h("span", { class: "tag " + (step.cls || "") }, step.tag), h("span", { html: step.text }));
  if (!$("#wt-code")) { /* no code panel */ } else {
  const lastOn = Math.max(...step.line), res = "  → " + step.vars.map(([k, v]) => `${k} = ${v}`).join("  ·  ");
  $("#wt-code").replaceChildren(...act.code.map((l, j) => h("span", { class: "ln" + (step.line.includes(j) ? " on" : "") }, l || " ", j === lastOn ? h("em", { class: "res" }, res) : null)));
  $("#wt-vars").replaceChildren(...step.vars.map(([k, v]) => h("div", {}, h("span", {}, k), h("code", {}, String(v)))));
  }
  const sl = $("#wt-scrub"); sl.max = act.steps.length - 1; sl.value = st.i;
  $("#wt-count").textContent = `step ${st.i + 1} of ${act.steps.length}`;
  $("#wt-prev").disabled = st.i === 0; $("#wt-next").disabled = st.i === act.steps.length - 1;
  $("#wt-iter-prev").hidden = $("#wt-iter-next").hidden = act.name !== "3 · Bandit";
}
const go = (i) => { st.i = Math.max(0, Math.min(acts[st.a].steps.length - 1, i)); paint(); };
const stop = () => { clearInterval(st.timer); st.timer = null; $("#wt-play").textContent = "▶ Play"; };
const play = () => {
  if (st.timer) return stop();
  if (st.i === acts[st.a].steps.length - 1) go(0);
  $("#wt-play").textContent = "❚❚ Pause";
  const tick = () => { if (st.i >= acts[st.a].steps.length - 1) return stop(); go(st.i + 1); st.timer = setTimeout(tick, speeds[$("#wt-speed").value]); };
  st.timer = setTimeout(tick, 200);
};
const jumpIter = (d) => {
  const steps = acts[st.a].steps, cur = steps[st.i].iter ?? -1, want = cur + d;
  const t = steps.findIndex((s) => s.iter === want && s.tag.startsWith("1"));
  go(want < 0 ? 0 : t < 0 ? steps.length - 1 : t);
};
$("#wt-acts").replaceChildren(...acts.map((a, j) => h("button", { "aria-pressed": String(j === 0), onclick: () => { stop(); st.a = j; st.i = 0; paint(); } }, a.name)));
$("#wt-prev").onclick = () => { stop(); go(st.i - 1); };
$("#wt-next").onclick = () => { stop(); go(st.i + 1); };
$("#wt-iter-prev").onclick = () => { stop(); jumpIter(-1); };
$("#wt-iter-next").onclick = () => { stop(); jumpIter(1); };
$("#wt-play").onclick = play;
$("#wt-scrub").oninput = (e) => { stop(); go(+e.target.value); };
document.addEventListener("keydown", (e) => {
  if (!root.matches(":hover, :focus-within") || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.key === "ArrowRight") { stop(); go(st.i + 1); } else if (e.key === "ArrowLeft") { stop(); go(st.i - 1); } else if (e.key === " ") { e.preventDefault(); play(); }
});
paint();
if (root.dataset.autoplay && !matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
  // Start when the replay scrolls into view; a visitor who touches a control takes over.
  const seen = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) { seen.disconnect(); play(); } }, { threshold: 0.5 });
  seen.observe(root);
}
}
})();
