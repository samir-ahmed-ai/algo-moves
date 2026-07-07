import { describe, expect, it } from 'vitest';
import {
  applySpacingOnly,
  braceFormat,
  formatCompleteSource,
  formatLineSpacing,
} from './styleFormat';

// ─── formatLineSpacing ──────────────────────────────────────────────────────

describe('formatLineSpacing – Go spacing', () => {
  it('spaces around = and commas', () => {
    expect(formatLineSpacing('x=1,y=2', 'go')).toBe('x = 1, y = 2');
  });

  it('spaces :=', () => {
    expect(formatLineSpacing('res:=make([]int,0)', 'go')).toBe('res := make([]int, 0)');
  });

  it('adds space before { after )', () => {
    expect(formatLineSpacing('func main(){', 'go')).toBe('func main() {');
  });

  it('spaces if keyword before (', () => {
    expect(formatLineSpacing('if(x>0){', 'go')).toBe('if (x > 0) {');
  });

  it('preserves string literals intact', () => {
    expect(formatLineSpacing('s:="a=b,c"', 'go')).toBe('s := "a=b,c"');
  });

  it('does NOT space * in pointer type `*int`', () => {
    // `*int` has nothing word-like on the left
    const out = formatLineSpacing('func foo(p *int){', 'go');
    expect(out).toContain('*int');
    expect(out).not.toMatch(/\* int/);
  });

  it('does NOT corrupt composite literals', () => {
    expect(formatLineSpacing('return []int{j,i}', 'go')).toBe('return []int{j, i}');
  });

  it('spaces binary - between identifiers', () => {
    expect(formatLineSpacing('seen[target-v]', 'go')).toBe('seen[target - v]');
  });

  it('does NOT add space inside () after spacing', () => {
    expect(formatLineSpacing('f( x, y )', 'go')).toBe('f(x, y)');
  });

  it('spaces == and !=', () => {
    expect(formatLineSpacing('a==b||c!=d', 'go')).toBe('a == b || c != d');
  });

  it('spaces compound assignment +=', () => {
    expect(formatLineSpacing('count+=1', 'go')).toBe('count += 1');
  });
});

describe('formatLineSpacing – JS spacing', () => {
  it('spaces function params', () => {
    expect(formatLineSpacing('function f(a,b){', 'js')).toBe('function f(a, b) {');
  });

  it('spaces return expression', () => {
    expect(formatLineSpacing('return a+b;', 'js')).toBe('return a + b;');
  });
});

// ─── formatCompleteSource ──────────────────────────────────────────────────

describe('formatCompleteSource – Go full pipeline', () => {
  it('formats messy multi-line Go', () => {
    const messy = 'func main(){\nx=1\nif(x>0){return x\n}\n}\n';
    const out = formatCompleteSource(messy, 'go');
    expect(out).toContain('func main() {');
    expect(out).toContain('\tx = 1');
    expect(out).toContain('\tif (x > 0) {');
    expect(out).toContain('\t\treturn x');
    // Must not have trailing newline
    expect(out).not.toMatch(/\n$/);
  });

  it('expands inline if block', () => {
    const out = formatCompleteSource('if (x>0){return x}', 'go');
    expect(out).toContain('if (x > 0) {');
    expect(out).toContain('return x');
    expect(out).toContain('}');
    // Must be multi-line
    expect(out.split('\n').length).toBeGreaterThan(1);
  });

  it('keeps composite literal on one line', () => {
    const out = formatCompleteSource('return []int{j,i}', 'go');
    // Should NOT split into multiple lines
    expect(out.split('\n').length).toBe(1);
    expect(out).toBe('return []int{j, i}');
  });

  it('handles full twoSum-style solution', () => {
    const messy = [
      'func twoSum(nums []int,target int)[]int{',
      'seen:=make(map[int]int)',
      'for i,v:=range nums{',
      'if j,ok:=seen[target-v];ok{',
      'return []int{j,i}',
      '}',
      'seen[v]=i',
      '}',
      'return nil',
      '}',
    ].join('\n');

    const out = formatCompleteSource(messy, 'go');

    // Function signature
    expect(out).toContain('func twoSum(nums []int, target int) []int {');
    // Variable declaration
    expect(out).toContain('seen := make(map[int]int)');
    // For loop
    expect(out).toContain('for i, v := range nums {');
    // Nested if
    expect(out).toContain('if j, ok := seen[target - v]; ok {');
    // Composite literal stays inline
    expect(out).toContain('return []int{j, i}');
    // Indentation: body lines start with a tab
    const bodyLines = out.split('\n').filter((l) => l.startsWith('\t'));
    expect(bodyLines.length).toBeGreaterThan(0);
  });

  it('handles } else { chains', () => {
    const messy = 'if(x>0){return 1}else{return -1}';
    const out = formatCompleteSource(messy, 'go');
    expect(out).toMatch(/\} else \{/);
    expect(out.split('\n').length).toBeGreaterThan(2);
  });

  it('does not add trailing newline', () => {
    expect(formatCompleteSource('func f() {}', 'go')).not.toMatch(/\n$/);
  });
});

describe('formatCompleteSource – JavaScript', () => {
  it('formats JS function', () => {
    const messy = 'function f(a,b){return a+b;}\n';
    const out = formatCompleteSource(messy, 'javascript');
    expect(out).toContain('function f(a, b) {');
    expect(out).toContain('return a + b;');
  });

  it('expands JS arrow body', () => {
    const messy = 'if (arr.length===0){return []}';
    const out = formatCompleteSource(messy, 'javascript');
    expect(out).toContain('if (arr.length === 0) {');
    expect(out.split('\n').length).toBeGreaterThan(1);
  });
});

describe('formatCompleteSource – Python (spacing only, no re-indent)', () => {
  it('normalises spacing without touching indentation', () => {
    const src = 'def f(a,b):\n    return a+b';
    const out = formatCompleteSource(src, 'python');
    // Spacing fixed
    expect(out).toContain('def f(a, b):');
    expect(out).toContain('return a + b');
    // Original indentation preserved
    expect(out).toContain('    return');
  });
});

// ─── braceFormat ───────────────────────────────────────────────────────────

describe('braceFormat', () => {
  it('indents with tabs for Go', () => {
    const src = 'func main() {\nreturn 1\n}\n';
    expect(braceFormat(src, '\t')).toBe('func main() {\n\treturn 1\n}');
  });

  it('indents with 2 spaces for JS', () => {
    const src = 'function f() {\nreturn 1;\n}\n';
    expect(braceFormat(src, '  ')).toBe('function f() {\n  return 1;\n}');
  });

  it('handles } else { depth correctly', () => {
    const src = 'if (x) {\nreturn 1;\n} else {\nreturn 0;\n}';
    const out = braceFormat(src, '  ');
    expect(out).toContain('  return 1;');
    expect(out).toContain('} else {');
    expect(out).toContain('  return 0;');
  });

  it('does NOT change depth for () or []', () => {
    // Multi-param function – () should not affect depth
    const src = 'func foo(\na int,\nb int,\n) int {\nreturn a + b\n}';
    const out = braceFormat(src, '\t');
    // The body line "return a + b" should be at depth 1 (one tab)
    expect(out).toContain('\treturn a + b');
  });

  it('handles composite literals correctly', () => {
    const src = 'func f() {\nreturn []int{1, 2}\n}';
    const out = braceFormat(src, '\t');
    expect(out).toBe('func f() {\n\treturn []int{1, 2}\n}');
  });
});

// ─── applySpacingOnly ──────────────────────────────────────────────────────

describe('applySpacingOnly', () => {
  it('normalises spacing while preserving existing indentation', () => {
    const src = '\t\tx=1\n\t\ty=2';
    const out = applySpacingOnly(src, 'go');
    expect(out).toBe('\t\tx = 1\n\t\ty = 2');
  });

  it('does not re-indent the code', () => {
    // Already correctly indented with spaces; spacing-only should not change depth
    const src = 'if (x > 0) {\n  return x;\n}';
    const out = applySpacingOnly(src, 'javascript');
    expect(out).toBe('if (x > 0) {\n  return x;\n}');
  });
});
