#!/usr/bin/env python3
"""Patch visualizer-only plugin index.tsx files to wire teaching stack."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src/plugins"

PLUGINS = {
    "insertion-sort": ("insertion steps", "Which element is inserted into the sorted prefix next?", "sorted"),
    "merge-sort": ("merge steps", "Which merge or split happens next?", "sorted"),
    "quick-sort": ("partition steps", "Which partition step happens next?", "sorted"),
    "heap-sort": ("heapify steps", "Which heap sift happens next?", "sorted"),
    "heap-operations": ("heap ops", "Which heap index swaps next?", "done"),
    "reverse-linked-list": ("pointer moves", "Which pointer moves next?", "reversed"),
    "linked-list-cycle": ("fast/slow steps", "Which pointer advances next?", "cycle"),
    "interval-scheduling": ("greedy picks", "Which interval is picked next?", "scheduled"),
    "two-sum-sorted": ("two-pointer moves", "Which pointer moves next?", "found"),
    "max-subarray-sum-k": ("window steps", "How does the window shift next?", "max"),
    "longest-substring": ("window steps", "How does the window expand or shrink next?", "longest"),
}

IMPORTS = """import { wireTeachingStack } from '../_shared/pluginKit';
import { goodCases, intro } from './cases';
import { quiz, codePieces } from './practice';
"""

for pid, (label, sim_q, verdict_label) in PLUGINS.items():
    path = ROOT / pid / "index.tsx"
    src = path.read_text()
    if "wireTeachingStack" in src:
        print(f"skip {pid}")
        continue

    src = src.replace(
        "from '../../core/types';\n",
        "from '../../core/types';\n" + IMPORTS,
        1,
    )

    m = re.search(r"export const (\w+) = definePlugin(<[^>]+>)?\(\{", src)
    if not m:
        print(f"FAIL {pid}: no export")
        continue
    export_name = m.group(1)
    type_params = m.group(2) or ""

    inputs_m = re.search(r"  inputs: (\[[\s\S]*?\]),\n  record,", src)
    if not inputs_m:
        print(f"FAIL {pid}: no inputs")
        continue
    inputs_block = inputs_m.group(1)

    teaching = f"""
const inputs = {inputs_block};
const verdict = () => ({{ ok: true, label: '{verdict_label}' }});
const teaching = wireTeachingStack({{
  record, View, inputs, verdict,
  practice: {{ quiz, codePieces, cases: {{ good: goodCases, intro, goodLabel: '{label}' }}, simulateQuestion: '{sim_q}' }},
}});
"""

    src = re.sub(
        rf"export const {export_name} = definePlugin{type_params}\(\{{",
        teaching + f"\nexport const {export_name} = definePlugin{type_params}({{",
        src,
        count=1,
    )
    src = re.sub(r"  inputs: \[[\s\S]*?\],\n", "", src, count=1)
    src = re.sub(r"  verdict: \(\) => \(\{ ok: true, label: '[^']*' \}\),\n", "  verdict,\n", src, count=1)
    src = re.sub(r"  verdict: \([^)]*\) =>[^,\n]+,\n", "  verdict,\n", src, count=1)

    if "tabs: teaching" not in src:
        if re.search(r"  code: \{", src):
            src = re.sub(
                r"(  code: \{ text: goSolution, lang: 'go', file: 'solution\.go' \},)\n",
                r"\1\n  codePieces,\n  quiz,\n  tabs: teaching.tabs,\n  wires: teaching.wires,\n",
                src,
                count=1,
            )
        else:
            src = re.sub(
                r"(  code: \{[^\n]+\n(?:.*?\n)*?  \},)\n",
                r"\1\n  codePieces,\n  quiz,\n  tabs: teaching.tabs,\n  wires: teaching.wires,\n",
                src,
                count=1,
            )

    if "  inputs,\n  record," not in src:
        src = src.replace("  record,", "  inputs,\n  record,", 1)

    path.write_text(src)
    print(f"+ {pid}")
