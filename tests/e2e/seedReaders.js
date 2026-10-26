// The four seed readers (supabase/seed.sql): real Supabase Auth accounts with
// public demo passwords. Tests sign in as them; liveDb.js uses them to restore data.
import { DEMO_LOGIN } from '../../src/lib/demoLogin.js'

export const SEED_READERS = [
  { id: '00000000-0000-4000-a000-000000000001', ...DEMO_LOGIN, display_name: 'BookLover42' },
  { id: '00000000-0000-4000-a000-000000000002', email: 'pageturner@example.com', password: 'pageturner1', display_name: 'PageTurner' },
  { id: '00000000-0000-4000-a000-000000000003', email: 'quietreader@example.com', password: 'quietreader1', display_name: 'QuietReader' },
  { id: '00000000-0000-4000-a000-000000000004', email: 'neonnovelist@example.com', password: 'neonnovelist1', display_name: 'NeonNovelist' },
]

export const seedReader = (id) => SEED_READERS.find((r) => r.id === id)
