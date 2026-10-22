#!/usr/bin/env python3
"""Export Aegis's attack-and-defense results for the manual's live demo.

    python3 demo_data.py [../aegis/results/attack_defense/2026-10-18.json]

The file is the recorded output of `experiments/attack_defense/run.py`. The demo shows
numbers from it and computes nothing.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT.parent / "aegis/results/attack_defense/2026-10-18.json")


def main():
    runs = json.loads(SOURCE.read_text())
    out = {"source": f"results/attack_defense/{SOURCE.name}", "ontologies": []}
    for run in runs:
        out["ontologies"].append(
            {
                "name": run["ontology"],
                "concepts": run["concepts"],
                "attack": [
                    {k: a[k] for k in ("budget", "greedy", "beam", "random_mean", "uct_mean", "uct_best_chain")}
                    for a in run["attack"]
                ],
                "defense": [
                    {k: d[k] for k in ("locks", "none", "random_mean", "top_impact", "best_response", "best_response_locks")}
                    for d in run["defense"]
                ],
            }
        )
    (ROOT / "demo-data.json").write_text(json.dumps(out))
    print(f"{len(out['ontologies'])} ontologies from {SOURCE.name}")


if __name__ == "__main__":
    main()
