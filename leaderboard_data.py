#!/usr/bin/env python3
"""Export Aegis's attack and defense results as two arena boards.

    python3 leaderboard_data.py [../aegis/results/attack_defense/2026-10-18.json]

Attack: the most harmful chain of three edits each search finds, at equal evaluations (higher is a stronger attacker).
Defense: the harm left after six locks against a two-edit attacker (lower is a better defense).
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT.parent / "aegis/results/attack_defense/2026-10-18.json")


def main():
    runs = json.loads(SOURCE.read_text())
    attack, defense = [], []
    for run in runs:
        by_budget = {a["budget"]: a for a in run["attack"]}
        k3 = by_budget[3]
        rows = []
        for name, key, group, tag in (
            ("UCT", "uct_mean", "aegis", "bandit at every node"),
            ("Beam", "beam", "aegis", "width 3"),
            ("Greedy", "greedy", "baseline", ""),
            ("Random", "random_mean", "baseline", "mean of 5 seeds"),
        ):
            rows.append({"name": name, "group": group, "tag": tag, "score": k3[key],
                         "values": {f"k{k}": by_budget[k][key] for k in (1, 2, 4)} | {"evals": k3["evaluations"]}})
        attack.append({
            "id": run["ontology"], "name": run["ontology"],
            "sub": f"{run['concepts']:,} concepts. The most harmful chain of three edits each search finds, given the same {k3['evaluations']} harm evaluations.",
            "metric": "harm", "metricLabel": "Harm at 3 edits", "fmt": "f2",
            "columns": [{"key": "k1", "label": "1 edit", "fmt": "f2"}, {"key": "k2", "label": "2 edits", "fmt": "f2"},
                        {"key": "k4", "label": "4 edits", "fmt": "f2"}, {"key": "evals", "label": "Evaluations", "fmt": "int"}],
            "rows": rows,
        })
        by_locks = {d["locks"]: d for d in run["defense"]}
        d6 = by_locks[6]
        rows = []
        for name, key, group, tag in (
            ("Best response", "best_response", "aegis", "locks chosen against the attacker's reply"),
            ("Top impact", "top_impact", "aegis", "locks the highest-impact triples"),
            ("Random", "random_mean", "baseline", "mean of 5 seeds"),
            ("No locks", "none", "baseline", ""),
        ):
            rows.append({"name": name, "group": group, "tag": tag, "score": d6[key],
                         "values": {f"l{m}": by_locks[m][key] for m in (2, 4, 8, 10)}})
        defense.append({
            "id": run["ontology"], "name": run["ontology"],
            "sub": f"{run['concepts']:,} concepts. Harm left after six locked triples against a two-edit attacker; lower is better.",
            "metric": "residual", "metricLabel": "Harm after 6 locks", "fmt": "f2", "lowerIsBetter": True,
            "columns": [{"key": "l2", "label": "2 locks", "fmt": "f2"}, {"key": "l4", "label": "4 locks", "fmt": "f2"},
                        {"key": "l8", "label": "8 locks", "fmt": "f2"}, {"key": "l10", "label": "10 locks", "fmt": "f2"}],
            "rows": rows,
        })
    groups = {"aegis": {"label": "Aegis", "ours": True}, "baseline": {"label": "Baseline"}}
    note = f"Harm is the mean F1 drop over five queries per ontology, from 0 to 1. From results/attack_defense/{SOURCE.name}."
    (ROOT / "leaderboard-attack.json").write_text(json.dumps({"note": note, "groups": groups, "boards": attack}))
    (ROOT / "leaderboard-defense.json").write_text(json.dumps({"note": note, "groups": groups, "boards": defense}))
    print(f"{len(attack)} attack boards, {len(defense)} defense boards")


if __name__ == "__main__":
    main()
