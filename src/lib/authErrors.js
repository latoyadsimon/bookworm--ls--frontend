// Turns Supabase Auth errors into the friendly messages from the error playbook
// (app_outline/user_stories.md §9). Unknown errors get a safe generic message.

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// PostgREST rejects a bad JWT with PGRST301 and an expired one (failed claims
// check) with PGRST303. Both mean the reader has to log in again.
const SESSION_EXPIRED_CODES = new Set(['PGRST301', 'PGRST303'])

export function isSessionExpired(error) {
  return SESSION_EXPIRED_CODES.has(error?.code)
}

export function friendlyAuthError(error, context = 'login') {
  if (!error) return null
  if (error.status === 0 || error.name === 'AuthRetryableFetchError') {
    return "Can't reach the server. Check your connection and try again."
  }
  switch (error.code) {
    case 'invalid_credentials':
      return 'Email or password is incorrect.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Too many attempts. Please wait a minute and try again.'
    case 'user_already_exists':
    case 'email_exists':
      return 'An account with this email already exists. Try logging in.'
    case 'weak_password':
      return 'Password must be at least 6 characters.'
    case 'email_address_invalid':
      return 'Enter a valid email address.'
    case 'unexpected_failure':
      // The profile trigger failed: in practice, the display name was taken
      return context === 'signup' ? 'That display name is taken. Try another one.' : 'Something went wrong. Please try again.'
    default:
      return 'Something went wrong. Please try again.'
  }
}
