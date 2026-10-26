import { vi } from 'vitest'

// The mock services wait a few hundred ms to feel like a real network.
// Tests use fake timers and fast-forward through that wait, so they run instantly.
// The result handlers are attached right away, so a rejection is never "unhandled".
export async function run(promise) {
  const result = promise.then(
    (value) => ({ value }),
    (error) => ({ error }),
  )
  await vi.runAllTimersAsync()
  const { value, error } = await result
  if (error) throw error
  return value
}
