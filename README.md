# Algo Moves

**Step through algorithms like a chess transcript.**

A plugin-driven visual learning app for coding interview prep. ~400 problems from [LeetCode](https://leetcode.com/), [HackerRank](https://www.hackerrank.com/), and original exercises — each replayed as a scrubbable sequence of **moves** with Code Studio, quizzes, and a mobile drill deck.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

```bash
cd algo-moves && npm install && npm run dev   # → http://localhost:4321
```

**Live demo:** [samir-ahmed-ai.github.io/algo-moves](https://samir-ahmed-ai.github.io/algo-moves/)

---

## Features

| | |
|---|---|
| **Visualize** | Step player, move log, inspector, shareable replay URLs |
| **Learn** | Cases · quiz · simulate-next-move · Code Studio (quiz → reassemble → recall) |
| **Mobile deck** | Swipe deck for topic drilling (`#mobile`) |
| **~400 problems** | 271 prep + 91 progress imports + 18 hand-built plugins — all with step simulators |

Built with React 18 · TypeScript 5 · Vite 5 · Tailwind · Radix UI · CodeMirror 6 · React Flow.

---

## Documentation

| Guide | Description |
|-------|-------------|
| [**Developer guide**](algo-moves/README.md) | Architecture, folder map, npm scripts, plugin contract |
| [**Plugin authoring**](algo-moves/src/plugins/README.md) | Writing `ProblemPlugin`s, vizKit, teaching stack |
| [**Design tokens**](algo-moves/src/design/README.md) | Typography and layout token hierarchy |
| [**Attributions**](algo-moves/ATTRIBUTIONS.md) | LeetCode, HackerRank, and third-party notices |

---

## Attribution

Problem **statements** draw from LeetCode, HackerRank, and educational classics. All **solutions, simulators, quizzes, and visualizations** in this repository are original implementations for personal study.

LeetCode and HackerRank are trademarks of their respective owners. This project is **not affiliated with either platform**. See [`algo-moves/ATTRIBUTIONS.md`](algo-moves/ATTRIBUTIONS.md) for the full notice.

---

## License

Copyright (c) 2026 Ahmed Samir · [MIT License](LICENSE)
