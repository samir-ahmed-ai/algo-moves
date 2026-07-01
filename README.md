# Algo Moves

**Live demo:** [samir-ahmed-ai.github.io/algo-moves](https://samir-ahmed-ai.github.io/algo-moves/) · **Best on mobile:** [Swipe mode ↗](https://samir-ahmed-ai.github.io/algo-moves/#mobile)

**Step through algorithms like a chess transcript.**

*Learn the way AI learns — test yourself, get feedback, repeat until it sticks.*

A plugin-driven visual learning app for coding interview prep. ~400 problems from [LeetCode](https://leetcode.com/), [HackerRank](https://www.hackerrank.com/), and original exercises — each replayed as a scrubbable sequence of **moves** with Code Studio, quizzes, and a mobile drill deck.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

```bash
cd algo-moves && npm install && npm run dev   # → http://localhost:4321
```

---

## Learn the way AI learns

How does a model get good? It tries, gets a signal, adjusts, and tries again. Reinforcement learning is not magic — it is **structured repetition with honest feedback**.

Algo Moves applies the same loop to human study:

1. **Watch** the algorithm move by move on a live canvas.
2. **Quiz** yourself — predict the next step, the complexity, the key line.
3. **Miss?** The run **restarts from question 1** — score resets, choices shuffle. You do not skip past the gap; you run the pattern again until it lands.
4. **Master** it — three correct answers in a row marks a problem mastered.

That is not punishment. It is how memory forms: testing your brain over and over, learning from each mistake, and rebuilding the path until recall is automatic. On desktop, **Code Studio** walks the same ladder — quiz → reassemble → blind recall. On your phone, **Swipe mode** runs animate → quiz → rebuild in a full-screen deck.

![The learning loop](algo-moves/docs/assets/learning-loop.svg)

![Human learning and AI training share the same feedback loop](algo-moves/docs/assets/brain-rl-loop.svg)

![Repetition builds long-term memory](algo-moves/docs/assets/memorize-stack.svg)

> **Built into the product:** wrong quiz answers trigger an automatic full restart (~1.9 s feedback, then back to Q1 with reshuffled choices). Mastery unlocks at a **3-streak**. See [Quiz & Code Studio](algo-moves/docs/quiz-and-code-studio.md) for the full rules.

## Features

Every problem is a **move transcript** you can scrub, replay, and drill:

| Mode | What you get |
|------|--------------|
| **Visualize** | Step player, move log, inspector, shareable replay URLs — replay algorithms on graphs, grids, arrays, and trees |
| **Learn** | Cases · quiz · simulate-next-move · Code Studio (quiz → reassemble → blind recall) |
| **Practice** | Wrong answer → full restart · shuffled choices · 3-streak mastery |
| **Mobile** | Full-screen swipe deck — add the PWA to your home screen; it opens directly at `#mobile` |

![Swipe mode mobile deck](algo-moves/docs/assets/mobile-swipe-deck.svg)

Built with React 18 · TypeScript 5 · Vite 5 · Tailwind · Radix UI · CodeMirror 6 · React Flow.

~400 problems: 271 prep + 91 progress imports + 18 hand-built plugins — all with step simulators.

---

## Documentation

| Guide | Description |
|-------|-------------|
| [**Developer guide**](algo-moves/README.md) | Architecture, folder map, npm scripts, plugin contract |
| [**Plugin authoring**](algo-moves/src/plugins/README.md) | Writing `ProblemPlugin`s, vizKit, teaching stack |
| [**Quiz & Code Studio**](algo-moves/docs/quiz-and-code-studio.md) | Choice format, shuffle/restart rules, highlighting, reassemble |
| [**Design tokens**](algo-moves/src/design/README.md) | Typography and layout token hierarchy |
| [**Attributions**](algo-moves/ATTRIBUTIONS.md) | LeetCode, HackerRank, and third-party notices |

## Attribution

Problem **statements** draw from LeetCode, HackerRank, and educational classics. All **solutions, simulators, quizzes, and visualizations** in this repository are original implementations for personal study.

LeetCode and HackerRank are trademarks of their respective owners. This project is **not affiliated with either platform**. See [`algo-moves/ATTRIBUTIONS.md`](algo-moves/ATTRIBUTIONS.md) for the full notice.

## License

Copyright (c) 2026 Ahmed Samir · [MIT License](LICENSE)
