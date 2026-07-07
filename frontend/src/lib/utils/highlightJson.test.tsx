import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { highlightJson } from './highlightJson';

describe('highlightJson', () => {
  it('colors keys, strings, numbers, and literals', () => {
    const html = renderToStaticMarkup(<>{highlightJson('{\n  "n": 5,\n  "ok": true\n}')}</>);
    expect(html).toContain('hl-json-key');
    expect(html).toContain('hl-json-num');
    expect(html).toContain('hl-json-lit');
    expect(html).toContain('hl-json-punct');
    expect(html).toContain('&quot;n&quot;');
    expect(html).toContain('5');
  });

  it('colors string values differently from keys', () => {
    const html = renderToStaticMarkup(<>{highlightJson('{\n  "order": "preorder"\n}')}</>);
    expect(html).toContain('hl-json-key');
    expect(html).toContain('hl-json-str');
  });

  it('passes through plain non-JSON text unchanged', () => {
    const html = renderToStaticMarkup(<>{highlightJson('MST 16')}</>);
    expect(html).not.toContain('hl-json-key');
    expect(html).toContain('MST 16');
  });

  it('does not color literal prefixes or bare signs in malformed JSON-like text', () => {
    const html = renderToStaticMarkup(<>{highlightJson('{"value": truex, "n": -}')}</>);
    expect(html).not.toContain('hl-json-lit');
    expect(html).not.toContain('hl-json-num');
    expect(html).toContain('truex');
  });
});
