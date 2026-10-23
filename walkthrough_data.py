#!/usr/bin/env python3
"""Export a recorded run of Aegis's attack and lock search for the manual's step-by-step page.

    uv run --project ../aegis python walkthrough_data.py

The trace comes from `experiments/walkthrough/trace.py` in the Aegis repository, which runs the library's own affected-area
ranking, greedy search, UCT (through its `on_iteration` hook), beam search, and best-response lock search on the small
materials ontology. The page replays it and computes nothing.
"""

import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TRACE = ROOT.parent / "aegis/experiments/walkthrough/trace.py"


def main():
    spec = importlib.util.spec_from_file_location("walkthrough_trace", TRACE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    data = module.build()
    (ROOT / "walkthrough-data.json").write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False))
    print(f"{len(data['uct']['iterations'])} UCT iterations, {len(data['states'])} states, from {TRACE.relative_to(ROOT.parent)}")


if __name__ == "__main__":
    main()
