# BookWorm — Product Definition & Failure Handling

## Context
Before we write any code, we need to agree on what BookWorm does and who it's for, and on how it should behave when something goes wrong. Below are answers to the 8 planning questions, plus an error-handling playbook. Decisions you made: search uses a box plus a type dropdown, there's no email confirmation, users can write many logs per book, and guests get sent to login and then returned to the page they were on.

**After you approve:** I'll save this content into the empty `app_outline/user_stories.md`, so it becomes the reference for the build. No app code is written in this step.

---

## Changes since planning (2026-10-25)
> **Going forward, the data model reference is the new ERD: [`erd.md`](../supabase/erd.md) and its diagram [`erd.png`](../supabase/erd.png)** (drawn from [`erd.html`](../supabase/erd.html)). It shows the tables exactly as they exist in Supabase. The older `app_outline/erd.md`, `app_outline/erd.png` and `app_outline/schema_draft.sql` are kept for history only.

- **The database is live.** The tables exist in Supabase project `vprneakhoedvmqpzsqex`, created one at a time as the migrations `create_profiles`, `create_library_items` and `create_logs`. The source is [`schema.sql`](../supabase/schema.sql).
- **Schema details now final** (§7 below is updated to match):
  - `library_items.thumbnail` is named **`thumbnail_url`**, and it must start with `https://`.
  - The logs composite FK has **three columns**: `(library_item_id, user_id, volume_id)`. A log's `volume_id` can't disagree with its library item.
  - `profiles` also has **`updated_at`**, kept current by a trigger, as do the other two tables.
  - There is a new index on **`logs(user_id)`**.
- **Permissions are explicit** (§8 rules unchanged). Every table starts with `revoke all` for guests and readers, then grants exactly what each needs. So the database doesn't rely on Supabase's default permissions, and clients never get TRUNCATE.
- **The sign-up trigger is deferred until the login screen is built.** It would create a profile automatically at sign-up, and it sits commented out in section 4 of `schema.sql`. Until then, profiles are only created by the seed.
- **Seed data is loaded** from [`seed.sql`](../supabase/seed.sql), for development only:
  - 4 readers who can log in, the same as the mock app (`demo@bookworm.dev` / `password123`, etc.);
  - 10 library items and 8 logs, using real Google Books volume IDs.
  - Delete these accounts, or change their passwords, before going public.
- **Still to do:** the front end still uses in-memory mocks. Connecting it to Supabase (`supabase-js`, `.env`, replacing `services/auth.js` and `services/db.js`) is the next step.

---

## 1. What problem does the app solve?
- Readers lose track of books they want to read, are reading, or have finished. Their notes end up scattered across notebooks, phone notes, and Goodreads tabs.
- Finding a next book is tedious. Store and library sites are cluttered and aren't fun to browse.
- It's hard to see what *real readers* thought of a specific book without making an account first.

**BookWorm's answer:** browse books Netflix-style without an account, read other people's logs on any book, and (once signed in) keep a private library with reading statuses and a journal of logs.

## 2. Who are the users?
One person, in two states:
- **Guest (anonymous visitor):** browses, searches, filters by genre, opens book pages, and reads everyone's logs.
- **Signed-in reader:** can do everything a guest can, plus keep a private library and write logs.

## 3. Primary goals
- **Guest:** discover interesting books quickly, see what a book is about, and see what other readers think of it.
- **Reader:** save books, track progress (want to read → reading → finished), write thoughts while reading, and edit or delete them later.

## 4. What information do they need?
- **Book cards:** cover (or a placeholder if there isn't one), title, author(s).
- **Book details:** title, author(s), description (or "No description available"), cover, plus the extra fields **publisher, published date, page count, categories**. Also the average rating if Google provides one.
- **Logs on a book:** the author's **display name** (never their email), the date, an optional 1–5 star rating, and the body text.
- **My Library:** each saved book with its cover, title, author(s), current reading status, and date added.
- **Feedback:** loading states, empty states ("No books found", "No logs yet — be the first"), and error messages.

## 5. What actions can they perform?
| Action | Guest | Reader |
|---|---|---|
| Browse "technology" home rows | ✅ | ✅ |
| Search (All / Title / Author / ISBN dropdown) | ✅ | ✅ |
| Filter by genre (Adventure, Technology, Horror, Sci-Fi, Fiction, Non-Fiction) | ✅ | ✅ |
| Load More on any list | ✅ | ✅ |
| View book details + all logs | ✅ | ✅ |
| Sign up (email, password, display name) / log in / log out | ✅ sign up, log in | ✅ log out |
| Add / remove a book in their library | → sent to login, then back | ✅ |
| Change reading status | ❌ | ✅ (own only) |
| Create / edit / delete logs (many per book, book must be in their library) | ❌ | ✅ (own only) |
| Read other users' logs | ✅ | ✅ (read only) |

## 6. Pages (routes)
| Route | Page | Access |
|---|---|---|
| `/` | Home: Netflix-style rows of "technology" books + Load More | Public |
| `/search?q=&type=` | Search results + Load More | Public |
| `/genre/:genre` | Genre results + Load More (genre chips/nav) | Public |
| `/books/:id` | Book details, Add/Remove library, status, all logs, log form (if in library) | Public (actions need login) |
| `/login`, `/signup` | Auth forms | Guests only (redirect if already logged in) |
| `/library` | My Library: list with status dropdown and remove button, filterable by status | Logged-in only |
| `*` | 404 Not Found | Public |

Every route has to work when visited directly or refreshed. On Vercel this needs a `vercel.json` rewrite that sends all paths to `index.html`.

## 7. What data must be collected? (schema)
> **Final design:** see the ERD in [`erd.md`](../supabase/erd.md) (diagram [`erd.png`](../supabase/erd.png), columns, RLS) and [`schema.sql`](../supabase/schema.sql) (the SQL live in Supabase). Display names are **unique, ignoring case**.
- **auth.users** (managed by Supabase Auth): holds the email and the hashed password. We only reference it.
- **profiles**: `id` (= auth user id, PK, FK → auth.users, on delete cascade), `display_name` (required, 2–30 chars), `theme` (text, default `street-royalty`, check constraint against the 9 style-mode keys in `style_guide.md`), `created_at`, `updated_at`. A database trigger will create this row automatically at signup from the display name entered on the form. *(Deferred until the login screen is built.)*
- **library_items**: `id`, `user_id`, `volume_id` (Google Books ID), `title`, `authors`, `thumbnail_url` (https only, cached so the library page needs no API calls), `status` (`want_to_read` | `reading` | `finished`, check constraint), `created_at`, `updated_at`. **Unique (user_id, volume_id)** so the same book can't be added twice.
- **logs**: `id`, `user_id`, `library_item_id`, `volume_id`, `body` (required, 1–5000 chars), `rating` (nullable, check 1–5), `created_at`, `updated_at`.
  - **Composite FK `(library_item_id, user_id, volume_id)` → `library_items(id, user_id, volume_id)` ON DELETE CASCADE.** The database itself rejects a log unless it points at the author's *own* library item for the *same* book, and removing the book deletes its logs automatically.

## 8. Permissions (Row Level Security on every table)
- **profiles:** anyone can SELECT (display names are public). A user can UPDATE only their own row.
- **library_items:** SELECT/INSERT/UPDATE/DELETE only where `user_id = auth.uid()`. **Fully private.**
- **logs:** anyone (including anonymous) can SELECT. INSERT/UPDATE/DELETE only where `user_id = auth.uid()`.
- **How this solves the design problem:** the book page queries `logs` by `volume_id` and joins `profiles` for the display name. It never touches `library_items`, so libraries stay private even though logs are public. Logs carry their own `volume_id` for exactly this reason.
- **Google API key:** stored only as an Edge Function secret (`GOOGLE_BOOKS_API_KEY`). The browser only ever calls our Edge Function.
- **Style mode:** a reader's chosen mode is saved in `profiles.theme`, which they can update only on their own row. Guests' choice lives in `localStorage` only.
- **Kid Korner filter:** while Kid Korner mode is active, the UI sends `kids=true` to the Edge Function. The function accepts only `true` or no value, and when it's `true` it adds Google's `maxAllowedMaturityRating=not-mature`. This is a gentle filter, not parental controls (see `style_guide.md`).

---

## 9. When things go wrong — error-handling playbook
General rule: **never a blank screen or a raw error.** Every failure shows a friendly message and, where it makes sense, a way to recover (Retry button, link home, link to login). Technical details go to the console, not the screen.

### Auth
| Situation | What the user sees |
|---|---|
| Wrong email **or** password | "Email or password is incorrect." Supabase intentionally doesn't say which one, so the login form can't be used to discover who has an account. |
| Empty field / bad email format | Inline under the field: "Enter a valid email address." The form isn't submitted. |
| Password too short at signup | "Password must be at least 6 characters." (Checked before submit too.) |
| Display name missing / too long | "Display name is required (2–30 characters)." |
| Display name already taken (any capitalization) | "That display name is taken. Try another one." |
| Email already registered | "An account with this email already exists. Try logging in." (with a link) |
| Too many attempts (rate limited) | "Too many attempts. Please wait a minute and try again." |
| Network down | "Can't reach the server. Check your connection and try again." |
| Session expired mid-action | "Your session expired. Please log in again." Redirect to `/login`, then back. |
| Guest visits `/library` | Redirect to `/login`, then back to `/library` after login. |
| Submit button | Disabled with a "Signing in…" label while the request runs (prevents double submits). |

### Edge Function (Google Books proxy)
| Situation | Function returns | UI shows |
|---|---|---|
| Missing/empty query | 400 `{error:"Please enter a search term."}` | Inline message under the search box |
| Query > 200 chars | 400 "Search is too long (max 200 characters)." | Inline message |
| Invalid ISBN when type = ISBN | 400 "ISBN must be 10 or 13 digits." | Inline message |
| Unknown genre | 400 "Unknown genre." | "Genre not found" + links to the valid genres |
| Page out of range (<0 or beyond the cap, e.g. startIndex > 200) | 400 "Invalid page." | Load More hides at the end of results |
| Google returns 429 | 429 "Too many requests right now — try again in a moment." | Friendly banner + Retry |
| Google 5xx / bad response | 502 "The book service is having trouble." | Banner + Retry |
| Timeout (~8 s via AbortController) | 504 "The book service took too long to respond." | Banner + Retry |
| Book ID not found | 404 "Book not found." | Book page "We couldn't find that book" + link home |
| Missing cover / description | (shaped) `thumbnail: null`, `description: null`, http→https | Placeholder cover / "No description available." |
| Zero results | 200 with an empty list | "No books found for 'xyz'. Try a different search." |

If Load More fails, the books already on screen **stay visible**, and a Retry appears under them.

### Database (Supabase)
| Situation | UI response |
|---|---|
| Add a book already in the library (unique violation) | Treat as success: "Already in your library." |
| Write a log for a book not in the library (FK/RLS rejection) | "Add this book to your library before writing a log." (The form is also hidden, but the DB is the real guard.) |
| Rating outside 1–5 / empty body (check constraint) | Inline: "Rating must be 1–5" / "Log can't be empty." Validated client-side first. |
| Removing a book that has logs | Confirm dialog: "Removing this book will also delete your N logs about it. Continue?" |
| Deleting a log | Confirm dialog first. |
| Any failed save/update | Toast: "Couldn't save your changes. Please try again." Keep the user's typed text, never lose a draft. |
| Logs fail to load on the book page | Book details still render. The logs section alone shows "Couldn't load logs" + Retry. |

### App-level
- **React Error Boundary** around routes: "Something went wrong" + "Go home" button, instead of a white screen.
- **404 page** for unknown routes.
- **Loading skeletons** for book rows and pages, so the layout doesn't jump.

---

## Verification (for this step)
- You read through this and confirm (or change) each answer.
- I then write it into `app_outline/user_stories.md`. You can check by opening that file.
