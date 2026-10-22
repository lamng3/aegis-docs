#!/usr/bin/env python3
"""Export what the Aegis playground's tests compare against, from the real library.

    ../aegis/.venv/bin/python playground_data.py      (or: cd ../aegis && uv run python ../aegis-docs/playground_data.py)

The toy materials ontology and workload of examples/attack_and_recover.py; the impact of every concept and relation; the
candidate units; the greedy and beam attacks at budgets 1 to 4; and, for seeded random chains, the harm, the F1 per query,
the attribution of each action, the net chain, and the last healthy state. The page's JavaScript port recomputes all of it.
"""

import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
AEGIS = ROOT.parent / "aegis"
sys.path.insert(0, str(AEGIS / "src"))

from aegis import KGQAScorer, Ontology, VersionedOntology, concept_impact  # noqa: E402
from aegis.actions import Action, InvalidAction, inject_concept, inject_relation, remove_concept, remove_relation  # noqa: E402
from aegis.attacks import beam, candidate_units, greedy, harm_over  # noqa: E402
from aegis.forensics import apply_chain, attribute, last_healthy, minimize  # noqa: E402
from aegis.impact import relation_impact, workload_harm  # noqa: E402

SUB = "subClassOf"
WORKLOAD = {
    "What kinds of material are there?": ("Material", ["Metal", "Alloy", "Steel", "Polymer"]),
    "What kinds of temperature are there?": ("Temperature", ["MeltingPoint"]),
}


def subclasses(ontology, root):
    found, frontier = set(), {root}
    while frontier:
        frontier = {s for s, p, o in ontology.relations if p == SUB and o in frontier} - found
        found |= frontier
    return found


def result(ontology, query):
    return subclasses(ontology, WORKLOAD[query][0])


def scorer_for(query):
    return KGQAScorer(result, [(query, frozenset(WORKLOAD[query][1]))])


def healthy(ontology):
    return {"Metal", "Alloy", "Steel"} <= subclasses(ontology, "Material")


def main():
    base = Ontology.from_json(json.loads((AEGIS / "examples/materials.json").read_text()))
    queries = list(WORKLOAD)
    workload_scorer = KGQAScorer(result, [(q, frozenset(g)) for q, (_, g) in WORKLOAD.items()])
    cdelta, rdelta = concept_impact(workload_scorer, base), relation_impact(workload_scorer, base)
    units = candidate_units(base, cdelta, rdelta, top=5)
    harm = harm_over(scorer_for, queries)
    searches = []
    for budget in (1, 2, 3, 4):
        g = greedy(harm, base, units, budget)
        b = beam(harm, base, units, budget, width=4, k=3)
        searches.append({
            "budget": budget,
            "greedy": {"chain": [str(a) for a in g.chain], "harm": g.harm, "evaluations": g.evaluations},
            "beam": [{"chain": [str(a) for a in s.chain], "harm": s.harm, "evaluations": s.evaluations} for s in b],
        })
    # seeded random chains drawn from every valid primitive on the evolving state
    rng = random.Random(5)
    pool_concepts = sorted(base.concepts) + ["Ceramic", "Metall", "Glass"]
    chains = []
    for _ in range(40):
        state, chain = base, []
        for _ in range(rng.randint(1, 5)):
            options = [remove_concept(c) for c in sorted(state.concepts)] + [Action("remove_relation", r) for r in sorted(state.relations)]
            options += [inject_concept(c) for c in pool_concepts if c not in state.concepts]
            options += [Action("inject_relation", (s, SUB, o)) for s in sorted(state.concepts) for o in sorted(state.concepts) if s != o and (s, SUB, o) not in state.relations]
            action = rng.choice(options)
            try:
                state, _ = action.apply(state)
            except InvalidAction:
                continue
            chain.append(action)
        v = VersionedOntology(base)
        for a in chain:
            v.apply(a)
        steps = attribute(result, queries, base, chain)
        net = minimize(base, chain)
        lsn = last_healthy(v, healthy)
        chains.append({
            "chain": [a.to_json() for a in chain],
            "harm": workload_harm(scorer_for, queries, base, state),
            "f1": [scorer_for(q)(state) for q in queries],
            "attribution": [s.size for s in steps],
            "net": [str(a) for a in net],
            "last_healthy": lsn,
            "healthy": healthy(state),
            "concepts": sorted(state.concepts), "relations": [list(r) for r in sorted(state.relations)],
        })
    data = {
        "ontology": base.to_json(), "workload": {q: {"root": r, "gold": g} for q, (r, g) in WORKLOAD.items()},
        "impact": {"concepts": cdelta, "relations": [[list(r), d] for r, d in rdelta.items()]},
        "units": [[a.to_json() for a in u] for u in units],
        "searches": searches, "chains": chains,
    }
    (ROOT / "playground-data.json").write_text(json.dumps(data))
    print(f"{len(units)} units, {len(searches)} searches, {len(chains)} random chains")


if __name__ == "__main__":
    main()
