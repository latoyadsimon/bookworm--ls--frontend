// A fake `src/lib/supabase.js` for unit tests: records every query and answers
// from a queue, so nothing ever touches the network.
import { vi } from 'vitest'

export const calls = [] // { table, steps: [[method, args]] } per query
let results = []

/** Queue the next result(s): `{ data, error, count }`. Unqueued queries resolve `{ data: null, error: null }`. */
export const queueResult = (...r) => results.push(...r)
export const resetMock = () => {
  calls.length = 0
  results = []
  invoke.mockReset()
}

function builder(table) {
  const call = { table, steps: [] }
  calls.push(call)
  const proxy = new Proxy(
    {},
    {
      get(_, method) {
        if (method === 'then') {
          const res = results.length ? results.shift() : { data: null, error: null }
          return (resolve, reject) => Promise.resolve(res).then(resolve, reject)
        }
        return (...args) => {
          call.steps.push([method, args])
          return proxy
        }
      },
    },
  )
  return proxy
}

export const invoke = vi.fn()
export const supabase = { from: vi.fn((table) => builder(table)), functions: { invoke } }
export const mockModule = { supabase, FUNCTION_REGION: 'us-east-2' }

/** The steps of a recorded query as `method(args)` strings, e.g. `eq(user_id,u1)`. */
export const stepsOf = (call) => call.steps.map(([m, a]) => `${m}(${a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)).join(',')})`)
