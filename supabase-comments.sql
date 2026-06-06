create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table comments enable row level security;

drop policy if exists "Anyone can read public note comments" on comments;
create policy "Anyone can read public note comments"
on comments for select
using (
  exists (
    select 1
    from notes
    where notes.id = comments.note_id
      and notes.visibility = 'public'
  )
);

drop policy if exists "Users can create their own comments" on comments;
create policy "Users can create their own comments"
on comments for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from notes
    where notes.id = comments.note_id
      and notes.visibility = 'public'
  )
);

drop policy if exists "Users can delete their own comments" on comments;
create policy "Users can delete their own comments"
on comments for delete
to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';
