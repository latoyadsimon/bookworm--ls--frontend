-- =====================================================================
-- BookWorm — draft database schema (Supabase / PostgreSQL)
-- Matches app_outline/erd.md. Not applied yet: this becomes the first
-- Supabase migration during the build phase.
--
-- Design problem solved here:
--   * library_items is PRIVATE (owner-only RLS, no anon access)
--   * logs are PUBLIC to read and carry their own volume_id, so a book
--     page lists every reader's logs without ever reading library_items
--   * a composite FK makes the database reject any log whose book is not
--     in its author's own library, and cascades deletes from the library
-- =====================================================================


-- ---------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- profiles: one row per auth user; display names are public
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    constraint profiles_display_name_format
      check (display_name = btrim(display_name) and char_length(display_name) between 2 and 30),
  theme        text not null default 'street-royalty'
    constraint profiles_theme_valid
      check (theme in (
        'street-royalty', 'cozy-library', 'little-cafe', 'neon-arcade',
        'midnight-observatory', 'greenhouse-botanical', 'retro-paperback',
        'comic-panel-pop', 'kid-korner'
      )),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Display names are unique, ignoring case ("BookLover42" = "booklover42")
create unique index profiles_display_name_lower_key on public.profiles (lower(display_name));

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile automatically when someone signs up.
-- The UI passes the name in signUp({ options: { data: { display_name } } }).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')));
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- library_items: a reader's saved books (PRIVATE)
-- ---------------------------------------------------------------------
create table public.library_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid()
                  references public.profiles (id) on delete cascade,
  volume_id     text not null
    constraint library_items_volume_id_length check (char_length(volume_id) between 1 and 64),
  title         text not null
    constraint library_items_title_length check (char_length(title) between 1 and 500),
  authors       text[] not null default '{}',
  thumbnail_url text
    constraint library_items_thumbnail_https check (thumbnail_url is null or thumbnail_url like 'https://%'),
  status        text not null default 'want_to_read'
    constraint library_items_status_valid check (status in ('want_to_read', 'reading', 'finished')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- A book can only be saved once per reader
  constraint library_items_user_volume_key unique (user_id, volume_id),
  -- Target for the logs composite foreign key below
  constraint library_items_id_user_volume_key unique (id, user_id, volume_id)
);

create trigger library_items_set_updated_at
  before update on public.library_items
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- logs: what readers wrote about a book (PUBLIC to read)
-- ---------------------------------------------------------------------
create table public.logs (
  id              uuid primary key default gen_random_uuid(),
  -- Direct FK to profiles lets PostgREST embed profiles(display_name)
  user_id         uuid not null default auth.uid()
                    references public.profiles (id) on delete cascade,
  library_item_id uuid not null,
  volume_id       text not null,
  body            text not null
    constraint logs_body_length check (char_length(btrim(body)) between 1 and 5000),
  rating          smallint
    constraint logs_rating_range check (rating between 1 and 5),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- The log's book must be in ITS AUTHOR'S library, its volume_id must
  -- match that library item, and removing the book deletes its logs.
  constraint logs_library_item_fkey
    foreign key (library_item_id, user_id, volume_id)
    references public.library_items (id, user_id, volume_id)
    on delete cascade
);

-- Book page: newest logs for one volume
create index logs_volume_id_created_at_idx on public.logs (volume_id, created_at desc);
-- Fast cascade deletes from library_items
create index logs_library_item_id_idx on public.logs (library_item_id);

create trigger logs_set_updated_at
  before update on public.logs
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.library_items enable row level security;
alter table public.logs          enable row level security;

-- profiles: everyone can read display names; you can edit only your own.
-- No insert/delete policies: the signup trigger inserts, auth cascade deletes.
create policy "Profiles are readable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- library_items: owner only, for everything
create policy "Users can read their own library"
  on public.library_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add to their own library"
  on public.library_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own library"
  on public.library_items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can remove from their own library"
  on public.library_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- logs: everyone reads; only the author writes
create policy "Logs are readable by everyone"
  on public.logs for select
  to anon, authenticated
  using (true);

create policy "Users can write their own logs"
  on public.logs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can edit their own logs"
  on public.logs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own logs"
  on public.logs for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- ---------------------------------------------------------------------
-- Table privileges (defense in depth on top of RLS)
-- Supabase grants ALL on public tables to anon/authenticated by default.
-- ---------------------------------------------------------------------
-- Guests never touch libraries at all
revoke all on public.library_items from anon;

-- Guests are read-only everywhere else
revoke insert, update, delete on public.profiles from anon;
revoke insert, update, delete on public.logs     from anon;

-- Profiles are created by the trigger and deleted by auth, never by clients
revoke insert, delete on public.profiles from authenticated;

-- Column-level UPDATE: only the fields the UI is allowed to change.
-- (A log can't be moved to another book; a saved volume_id can't change.)
revoke update on public.profiles      from authenticated;
revoke update on public.library_items from authenticated;
revoke update on public.logs          from authenticated;
grant  update (display_name, theme) on public.profiles      to authenticated;
grant  update (status)              on public.library_items to authenticated;
grant  update (body, rating)        on public.logs          to authenticated;
