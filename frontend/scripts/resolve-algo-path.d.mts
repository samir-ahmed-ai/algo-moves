export function resolvePrepRoot(
  frontendRoot: string,
  env?: Record<string, string | undefined>,
): { path: string; via: string };

export function resolveAlgoRoot(
  frontendRoot: string,
  env?: Record<string, string | undefined>,
): { path: string; via: string };
