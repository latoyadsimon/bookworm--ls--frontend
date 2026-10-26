import { describe, expect, it } from 'vitest'
import { EMAIL_PATTERN, friendlyAuthError, isSessionExpired } from '../../src/lib/authErrors'

// Messages come from the error playbook in app_outline/user_stories.md.
describe('friendlyAuthError', () => {
  it('returns null when there is no error', () => {
    expect(friendlyAuthError(null)).toBeNull()
  })

  it.each([
    ['invalid_credentials', 'Email or password is incorrect.'],
    ['over_request_rate_limit', 'Too many attempts. Please wait a minute and try again.'],
    ['user_already_exists', 'An account with this email already exists. Try logging in.'],
    ['weak_password', 'Password must be at least 6 characters.'],
  ])('maps %s to the playbook message', (code, message) => {
    expect(friendlyAuthError({ code })).toBe(message)
  })

  it('treats a network failure as offline', () => {
    expect(friendlyAuthError({ name: 'AuthRetryableFetchError', status: 0 })).toBe(
      "Can't reach the server. Check your connection and try again.",
    )
  })

  it('explains a failed profile trigger as a taken display name, on sign-up only', () => {
    expect(friendlyAuthError({ code: 'unexpected_failure' }, 'signup')).toBe('That display name is taken. Try another one.')
    expect(friendlyAuthError({ code: 'unexpected_failure' }, 'login')).toBe('Something went wrong. Please try again.')
  })

  it('never shows raw server text for unknown errors', () => {
    expect(friendlyAuthError({ code: 'something_new', message: 'stack trace here' })).toBe('Something went wrong. Please try again.')
  })
})

describe('isSessionExpired', () => {
  // PGRST301 = bad JWT (seen live), PGRST303 = expired JWT (PostgREST docs)
  it.each(['PGRST301', 'PGRST303'])('treats %s as an expired session', (code) => {
    expect(isSessionExpired({ code, message: 'JWT expired' })).toBe(true)
  })

  it.each([
    ['a permission error', { code: '42501' }],
    ['a foreign key error', { code: '23503' }],
    ['a network failure', { code: 'NETWORK' }],
    ['no code', { message: 'oops' }],
    ['no error', null],
  ])('does not treat %s as expired', (_, error) => {
    expect(isSessionExpired(error)).toBe(false)
  })
})

describe('EMAIL_PATTERN', () => {
  it('accepts normal emails and rejects broken ones', () => {
    expect(EMAIL_PATTERN.test('reader@bookworm.dev')).toBe(true)
    expect(EMAIL_PATTERN.test('not-an-email')).toBe(false)
    expect(EMAIL_PATTERN.test('a@b.c')).toBe(false)
    expect(EMAIL_PATTERN.test('two words@x.com')).toBe(false)
  })
})
