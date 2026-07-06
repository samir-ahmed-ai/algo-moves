/** Map backend auth error codes/messages to user-facing copy. */
export function formatAuthError(error: string): string {
  switch (error) {
    case 'not-configured':
      return 'Accounts are unavailable — the server has no database configured.';
    case 'invalid credentials':
      return 'Wrong email or password.';
    case 'account not found':
      return 'No account with that email. Try signing up instead.';
    case 'email already registered':
      return 'That email is already registered. Try logging in.';
    case 'invalid email':
      return 'Enter a valid email address.';
    case 'password must be at least 8 characters':
      return 'Password must be at least 8 characters.';
    case 'Network error — check your connection':
      return error;
    default:
      return error;
  }
}
