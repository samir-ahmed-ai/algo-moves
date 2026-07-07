/** Maps backend OpenAI key errors to a user-friendly message. */
export function formatResumeAiError(error: string): string {
  if (
    error.includes('OpenAI API key') ||
    error.includes('Settings → Profile') ||
    error.includes('OPENAI_API_KEY')
  ) {
    return 'Add your OpenAI API key in Settings → Profile to use AI features.';
  }
  return error;
}

export function isOpenAIKeyError(error: string): boolean {
  return (
    error.includes('OpenAI API key') ||
    error.includes('Settings → Profile') ||
    error.includes('OPENAI_API_KEY')
  );
}
