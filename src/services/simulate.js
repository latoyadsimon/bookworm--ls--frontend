// Demo switches shared by the database adapters: ?simulate=db|logs|expired.
// The switch is remembered from the first page load, so it survives in-app navigation.
const read = () => {
  try {
    return new URLSearchParams(window.location.search).get('simulate')
  } catch {
    return null
  }
}
const initial = read()

export const NETWORK_ERROR = { message: 'The database is not responding.', code: 'NETWORK' }
export const EXPIRED = { message: 'JWT expired', code: 'PGRST303' }

/** The forced failure for this kind of call, or null. */
export function simulatedError({ write = false, kind } = {}) {
  const mode = read() ?? initial
  if (mode === 'db') return NETWORK_ERROR
  if (mode === 'logs' && kind === 'logs') return NETWORK_ERROR
  if (mode === 'expired' && write) return EXPIRED
  return null
}
