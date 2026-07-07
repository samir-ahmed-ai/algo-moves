import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InterviewToolkitGrid } from './InterviewToolkitGrid';
import { INTERVIEW_TOOLS } from './interviewToolkit';

describe('InterviewToolkitGrid', () => {
  it('renders all interview tools with the section label by default', () => {
    const html = renderToStaticMarkup(<InterviewToolkitGrid onSelect={() => {}} />);

    expect(html).toContain('>Interview<');
    for (const tool of INTERVIEW_TOOLS) {
      expect(html).toContain(tool.title);
      expect(html).toContain(tool.subtitle);
    }
  });

  it('can hide the section label for nested profile layouts', () => {
    const html = renderToStaticMarkup(
      <InterviewToolkitGrid onSelect={() => {}} showLabel={false} />,
    );

    expect(html).not.toContain('>Interview<');
    expect(html).toContain('Interview Canvas');
    expect(html).toContain('Resumes');
  });
});
