import type { QuizQuestion } from '../_shared/practice';
import type { CodePiece } from '../../lib/codePieces';

export const quiz: QuizQuestion[] = [
  {
    id: 'sort-key',
    prompt: 'What sort key makes the greedy interval schedule optimal?',
    choices: [
      { label: 'Finish time ascending — earliest finish first', correct: true },
      { label: 'Start time ascending — not optimal key' },
      { label: 'Longest first wastes room early — pick earliest finish time' },
      { label: 'Random order — breaks greedy proof' },
    ],
    explain: 'Earliest finish time leaves the most room for future jobs — exchange argument proves optimality.',
  },
];

export const codePieces: CodePiece[] = [
  { id: 'sig', code: 'func schedule(intervals [][]int) int {', role: 'maximum number of non-overlapping intervals' },
  { id: 'sort', code: '\tsort.Slice(intervals, func(i, j int) bool {\n\t\treturn intervals[i][1] < intervals[j][1]\n\t})', role: 'earliest finish first' },
  { id: 'init', code: '\tcount, end := 0, math.MinInt', role: 'accepted count and last finish time' },
  { id: 'loop', code: '\tfor _, iv := range intervals {', role: 'scan sorted intervals' },
  { id: 'take', code: '\t\tif iv[0] >= end {\n\t\t\tcount++\n\t\t\tend = iv[1]\n\t\t}', role: 'accept if compatible with last finish' },
  { id: 'ret', code: '\t}\n\treturn count\n}', role: 'return job count' },
];
