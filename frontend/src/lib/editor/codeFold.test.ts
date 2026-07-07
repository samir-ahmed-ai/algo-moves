import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { allSectionFoldRanges, sectionFoldRange } from './codeFold';

const twoSumGo = `package main

func twoSum(nums []int, target int) []int {
	seen := make(map[int]int)
	for i, v := range nums {
		if j, ok := seen[target-v]; ok {
			return []int{j, i}
		}
		seen[v] = i
	}
	return nil
}

func helper() int {
	return 1
}
`;

describe('sectionFoldRange', () => {
  it('finds func body range in Go', () => {
    const state = EditorState.create({ doc: twoSumGo });
    const range = sectionFoldRange(state, 3, 'go');
    expect(range).not.toBeNull();
    expect(state.sliceDoc(range!.from, range!.to)).toContain('seen := make');
    expect(state.sliceDoc(range!.from, range!.to)).toContain('return nil');
  });

  it('finds helper func body separately', () => {
    const state = EditorState.create({ doc: twoSumGo });
    let helperLine = 0;
    for (let n = 1; n <= state.doc.lines; n++) {
      if (state.doc.line(n).text.includes('func helper')) {
        helperLine = n;
        break;
      }
    }
    const range = sectionFoldRange(state, helperLine, 'go');
    expect(range).not.toBeNull();
    expect(state.sliceDoc(range!.from, range!.to).trim()).toBe('return 1');
  });
});

describe('allSectionFoldRanges', () => {
  it('returns one range per top-level func', () => {
    const state = EditorState.create({ doc: twoSumGo });
    const ranges = allSectionFoldRanges(state, 'go');
    expect(ranges.length).toBe(2);
  });

  it('folds type struct bodies in Go', () => {
    const src = `package main

type Node struct {
	Val int
	Next *Node
}
`;
    const state = EditorState.create({ doc: src });
    const ranges = allSectionFoldRanges(state, 'go');
    expect(ranges.length).toBe(1);
    expect(state.sliceDoc(ranges[0]!.from, ranges[0]!.to)).toContain('Val int');
  });
});
