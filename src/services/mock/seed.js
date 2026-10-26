// The four seed readers. Their profiles, libraries and logs live in Supabase
// (ids below are the real profile UUIDs). The login itself is still a mock, so
// these demo passwords exist only here; nothing secret is stored.

export const DEMO_LOGIN = { email: 'demo@bookworm.dev', password: 'password123' }

export const SEED_USERS = [
  { id: '00000000-0000-4000-a000-000000000001', email: DEMO_LOGIN.email, password: DEMO_LOGIN.password, display_name: 'BookLover42' },
  { id: '00000000-0000-4000-a000-000000000002', email: 'pageturner@example.com', password: 'pageturner1', display_name: 'PageTurner' },
  { id: '00000000-0000-4000-a000-000000000003', email: 'quietreader@example.com', password: 'quietreader1', display_name: 'QuietReader' },
  { id: '00000000-0000-4000-a000-000000000004', email: 'neonnovelist@example.com', password: 'neonnovelist1', display_name: 'NeonNovelist' },
]


const PERSISTED = new Set(SEED_USERS.map((u) => u.id))

/** Seed readers live in Supabase; readers who signed up this session are in memory only. */
export const isPersistedUser = (id) => PERSISTED.has(id)
