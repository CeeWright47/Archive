import { isAuthWeakPasswordError, type AuthError } from '@supabase/supabase-js';

// Supabase's default; the project doesn't set a custom minimum.
const MIN_PASSWORD_LENGTH = 6;

export const ALREADY_REGISTERED_MESSAGE =
  'An account with this email already exists. Sign in instead.';
const GENERIC_MESSAGE = 'Something went wrong — try again.';

function weakPasswordMessage(error: AuthError): string {
  const reasons = isAuthWeakPasswordError(error) ? error.reasons : [];
  if (reasons.includes('pwned')) {
    return 'That password has appeared in a data breach. Choose a different one.';
  }
  if (reasons.includes('characters')) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters, mixing letters, numbers, and symbols.`;
  }
  return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
}

/**
 * Maps a Supabase auth error to copy a person can act on. Matches on the
 * stable error code first and falls back to the message text, since older
 * auth servers don't always send a code. Always logs the raw error.
 */
export function authErrorMessage(error: AuthError): string {
  console.warn('[auth]', error.code ?? error.name, error.message);

  const code = error.code ?? '';
  const message = error.message.toLowerCase();

  if (code === 'over_email_send_rate_limit' || message.includes('rate limit')) {
    return 'Too many sign-ups right now. Try again in a few minutes, or use Sign in with Apple.';
  }
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return "That email and password don't match.";
  }
  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    message.includes('already registered')
  ) {
    return ALREADY_REGISTERED_MESSAGE;
  }
  if (code === 'weak_password' || isAuthWeakPasswordError(error) || message.includes('password should be')) {
    return weakPasswordMessage(error);
  }
  return GENERIC_MESSAGE;
}
