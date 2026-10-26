# User Journey — BookWorm

**What it is:** A Netflix-style book browsing web app. Anyone can discover books and read other readers' logs. Signed-in readers can build a private library and write logs about what they read.

**Problem:** Readers need one place to discover books, see what real readers think of them, and keep track of what they want to read, are reading, and have finished, without scattered notes.

**User:** One type, a reader, who can be in two states:
- **Guest** (not logged in): browses, searches, filters by genre, views books, and reads logs.
- **Signed-in reader:** can do everything a guest can, plus manage a private library and write logs.

## The journey

1. **Opens the app** → lands on **Home (`/`)**. Sees a large featured technology book (cover, title, author(s), short description, "View details" button). Below it are side-scrolling Netflix-style rows of technology books, e.g. *Programming*, *Artificial Intelligence*, *Computers & Technology*. Each card shows a cover, title, and author(s).
   - **While loading:** skeleton cards appear in each row, so the layout doesn't jump.
   - **Reaches the end of a row** → a "Load More" card at the end of the row fetches the next batch into that row.
   - **No more results** → the Load More card disappears.
   - **Book has no cover** → a styled placeholder cover with the title shows instead.
   - **Book service down / rate limited / slow** → that row shows "We couldn't load these books right now" + a Retry button. Other rows still work.

2. **Browses by genre** → clicks a genre in the nav or the genre chips (Adventure, Technology, Horror, Sci-Fi, Fiction, Non-Fiction) → goes to **Genre (`/genre/:genre`)**. Sees a grid of books for that genre. The selected genre chip is highlighted.
   - **Clicks Load More** under the grid → more books are added below the current ones, and the user's scroll position is kept.
   - **No more results** → the Load More button hides and "You've reached the end" shows.
   - **Load More fails** → books already shown stay on screen, and an error with Retry appears under them.
   - **Unknown genre in the URL** (e.g. `/genre/cooking`) → "Genre not found" + links to the six real genres.
   - **Clicks a book** → goes to its Book Details page.

3. **Searches for a book** → types in the search bar, chooses a type from the dropdown (**All / Title / Author / ISBN**), and submits → goes to **Search Results (`/search?q=:query&type=:type`)**.
   - **Matches:** a grid of matching books + Load More.
   - **No matches:** "No books found for '*query*'. Try a different search or search type."
   - **Empty search:** not submitted. The search box shows "Please enter a search term."
   - **Search longer than 200 characters:** "Search is too long (max 200 characters)."
   - **ISBN type but not 10 or 13 digits:** "ISBN must be 10 or 13 digits." Not submitted.
   - **Refreshing or sharing the URL** shows the same results, because the query lives in the URL.

4. **Views a book** → clicks any book card → **Book Details (`/books/:id`)**. Sees the cover, title, author(s), description, publisher, published date, page count, and categories. Below that are **Reader Logs** from all users, newest first, each showing the writer's **display name** (never email), the date, an optional ★ rating, and the text.
   - **No description** → "No description available."
   - **No logs yet** → "No logs yet. Be the first to write one!"
   - **Invalid book ID** → "We couldn't find that book" + link back Home.
   - **Logs fail to load** → book details still show. Only the logs section says "Couldn't load logs" + Retry.
   - **Visited directly or refreshed** → the page loads normally (no 404).
   - **Guest clicks "Add to Library"** → sent to **Log In**. After logging in, returned to this same book page.

5. **Signs up** → clicks "Sign Up" → **Sign Up (`/signup`)**. Enters a **display name**, email, and password → account created, logged in right away (no email confirmation), and sent to where they came from (or Home). A profile with their display name is created automatically.
   - **Display name missing or not 2–30 characters** → "Display name is required (2–30 characters)."
   - **Invalid email format** → "Enter a valid email address."
   - **Password under 6 characters** → "Password must be at least 6 characters."
   - **Email already registered** → "An account with this email already exists. Try logging in." (with a link)
   - **While submitting** → the button shows "Creating account…" and is disabled.

6. **Logs in** → **Log In (`/login`)**. Enters email and password → logged in and returned to the page they were trying to reach (or Home). The nav now shows **My Library**, their display name, and **Log Out**.
   - **Wrong email or password** → "Email or password is incorrect." (Supabase intentionally doesn't reveal which one.)
   - **Empty fields** → inline "Email is required" / "Password is required."
   - **Too many attempts** → "Too many attempts. Please wait a minute and try again."
   - **No internet / server unreachable** → "Can't reach the server. Check your connection and try again."
   - **Already logged in and visits `/login` or `/signup`** → redirected Home.

7. **Adds a book to their library** → on Book Details, clicks **Add to Library** → the book is saved with status **Want to Read**. The button changes to a **status dropdown** (Want to Read / Reading / Finished) plus a **Remove from Library** button.
   - **Already in their library** → the page shows the status dropdown instead of Add. The database also blocks duplicates.
   - **Save fails** → toast "Couldn't add this book. Please try again." The button resets.

8. **Writes a log** → on Book Details for a book **in their library**, a **"Write a log"** form appears above Reader Logs: a text box plus an optional 1–5 star rating. Submits → the new log appears at the top of the list with their display name and today's date.
   - **Book not in their library** → no form, just "Add this book to your library to write a log." The database also rejects logs for books not in the author's library.
   - **Empty text** → "Log can't be empty." Not submitted.
   - **Edits their own log** → clicks **Edit** on their log → the text and rating become editable → **Save** updates it, **Cancel** reverts it.
   - **Deletes their own log** → clicks **Delete** → confirms "Delete this log?" → the log disappears.
   - **Other users' logs** → no Edit or Delete buttons (and the database blocks changes anyway).
   - **Save fails** → toast "Couldn't save your log. Please try again." The typed text is kept.

9. **Manages their library** → clicks **My Library** → **My Library (`/library`)**. Sees all saved books (cover, title, author(s), status, date added), with filter tabs: **All / Want to Read / Reading / Finished**.
   - **Changes a status** with the dropdown → saved immediately, with a small "Saved" confirmation.
   - **Clicks a book** → opens its Book Details page (to read or write logs).
   - **Removes a book** → confirms "Removing this book will also delete your N logs about it. Continue?" → the book and its logs are deleted.
   - **Empty library** → "Your library is empty" + a **Browse books** button.
   - **Empty filter tab** → "No books marked *Reading* yet."
   - **Refreshes the page** → everything is still there (saved in Supabase).
   - **Guest visits `/library`** → sent to Log In, then returned here.
   - **Session expires** → "Your session expired. Please log in again." → Log In, then back.

10. **Logs out** → clicks **Log Out** → returned Home as a guest. My Library disappears from the nav. Pressing Back to `/library` sends them to Log In.

11. **Navigates around** → the top nav bar (Logo/Home, Genres, Search bar, My Library, Log In/Sign Up or Display Name/Log Out) is on every page.
    - The current page is highlighted.
    - Browser Back and Forward work as expected.
    - On phones, the nav collapses into a menu and rows stay swipeable.

12. **Visits an unknown URL** → a friendly **404 Not Found** page with a link back Home.
    - **Unexpected crash anywhere** → "Something went wrong" + **Go Home** button instead of a blank white screen.

## Data rules
- **Frontend:** React (Vite) + React Router handles the pages, forms, loading/error states, and temporary UI state.
- **Book data:** comes from the Google Books API, **only through a Supabase Edge Function**. The browser never calls Google directly, and the API key stays secret on the server. The function validates input, trims the response to what the UI needs, and returns friendly errors for 429, timeouts, and upstream failures.
- **Database:** Supabase PostgreSQL stores `profiles`, `library_items`, and `logs`. Book details are not stored, only the Google Books volume ID (plus title, authors, and cover for the Library page).
- **Profiles:** one per user, with a public display name. Users can edit only their own.
- **Library:** **private.** Row Level Security lets each user see and change only their own library items. No other user, and no guest, can read them.
- **Logs:** **public to read** for everyone, including guests. Only the author can create, edit, or delete their own logs. The database requires that a log belongs to a book in the author's own library, and deleting that library item deletes its logs.
- **Persistence:** library, statuses, and logs survive refreshes and new browsers because they're saved in Supabase.
- **Initial data:** no seeding is needed for books, since they come live from Google Books. Logs start empty.
- **Hosting:** deployed on Vercel. Every route works on direct visit or refresh.
- **Scope:** browsing, searching, library, and logs only. Out of scope: reading the books themselves, buying books, social features (following, likes, comments on logs), recommendations, and live/real-time updates.

