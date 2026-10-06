-- r4 networking: temporary micro-communities (pods, session back-channels, line buddies,
-- agent pods, give/ask board, coffee roulette). Attendees use anonymous sign-in.
-- Everything expires; purge_expired() cleans up hourly when pg_cron is available.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  role text not null default '',
  company text not null default '',
  linkedin text not null default '',
  persona text not null default '',
  topics text[] not null default '{}',
  looking_for text not null default '',
  can_offer text not null default '',
  discoverable boolean not null default true,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create table if not exists public.pods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  kind text not null default 'pod' check (kind in ('pod', 'session', 'line', 'agent')),
  room_key text unique,
  title text not null check (length(title) between 1 and 120),
  topic text not null default '',
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 day',
  reunion_at timestamptz
);

create table if not exists public.pod_members (
  pod_id uuid not null references public.pods on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  status text not null default 'joined' check (status in ('joined', 'invited')),
  joined_at timestamptz not null default now(),
  primary key (pod_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references public.pods on delete cascade,
  user_id uuid references public.profiles on delete set null default auth.uid(),
  author text not null default '',
  kind text not null default 'msg' check (kind in ('msg', 'question', 'takeaway', 'intro')),
  body text not null check (length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists messages_pod_idx on public.messages (pod_id, created_at);

create table if not exists public.votes (
  message_id uuid not null references public.messages on delete cascade,
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  primary key (message_id, user_id)
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  author text not null default '',
  kind text not null check (kind in ('give', 'ask')),
  body text not null check (length(body) between 1 and 280),
  topics text[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '3 days'
);

create table if not exists public.roulette (
  user_id uuid primary key references public.profiles on delete cascade default auth.uid(),
  round text not null,
  topics text[] not null default '{}',
  partner uuid references public.profiles on delete set null,
  spot text,
  joined_at timestamptz not null default now()
);

-- ---------- helpers (security definer avoids RLS recursion) ----------
create or replace function public.pod_visible(p public.pods) returns boolean
language sql stable as $$
  select p.expires_at > now() - interval '1 day' or (p.reunion_at is not null and now() < p.reunion_at + interval '7 days');
$$;

-- open for posting: before expiry, or during the 7-day reunion window
create or replace function public.pod_open(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from pods x where x.id = p and (x.expires_at > now()
    or (x.reunion_at is not null and now() >= x.reunion_at and now() < x.reunion_at + interval '7 days')));
$$;

create or replace function public.is_member(p uuid, joined_only boolean default false) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from pod_members m join pods x on x.id = m.pod_id
    where m.pod_id = p and m.user_id = auth.uid() and public.pod_visible(x)
      and (not joined_only or m.status = 'joined'));
$$;

create or replace function public.shares_space(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from pod_members a join pod_members b on a.pod_id = b.pod_id
                 where a.user_id = auth.uid() and b.user_id = other)
      or exists (select 1 from roulette r where (r.user_id = auth.uid() and r.partner = other)
                                              or (r.user_id = other and r.partner = auth.uid()));
$$;

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.pods enable row level security;
alter table public.pod_members enable row level security;
alter table public.messages enable row level security;
alter table public.votes enable row level security;
alter table public.offers enable row level security;
alter table public.roulette enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or (expires_at > now() and (discoverable or public.shares_space(id))));
drop policy if exists profiles_write on public.profiles;
create policy profiles_write on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles for delete to authenticated using (id = auth.uid());

drop policy if exists pods_read on public.pods;
create policy pods_read on public.pods for select to authenticated using (public.is_member(id));
drop policy if exists pods_delete on public.pods;
create policy pods_delete on public.pods for delete to authenticated using (created_by = auth.uid());

drop policy if exists members_read on public.pod_members;
create policy members_read on public.pod_members for select to authenticated using (public.is_member(pod_id));
drop policy if exists members_accept on public.pod_members;
create policy members_accept on public.pod_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and status = 'joined');
drop policy if exists members_leave on public.pod_members;
create policy members_leave on public.pod_members for delete to authenticated using (user_id = auth.uid());

drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated using (public.is_member(pod_id));
drop policy if exists messages_post on public.messages;
create policy messages_post on public.messages for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(pod_id, true) and public.pod_open(pod_id));
drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages for delete to authenticated using (user_id = auth.uid());

drop policy if exists votes_read on public.votes;
create policy votes_read on public.votes for select to authenticated
  using (exists (select 1 from public.messages m where m.id = message_id and public.is_member(m.pod_id)));
drop policy if exists votes_cast on public.votes;
create policy votes_cast on public.votes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.messages m where m.id = message_id and public.is_member(m.pod_id, true) and public.pod_open(m.pod_id)));
drop policy if exists votes_undo on public.votes;
create policy votes_undo on public.votes for delete to authenticated using (user_id = auth.uid());

drop policy if exists offers_read on public.offers;
create policy offers_read on public.offers for select to authenticated using (expires_at > now());
drop policy if exists offers_post on public.offers;
create policy offers_post on public.offers for insert to authenticated with check (user_id = auth.uid());
drop policy if exists offers_delete on public.offers;
create policy offers_delete on public.offers for delete to authenticated using (user_id = auth.uid());

drop policy if exists roulette_read on public.roulette;
create policy roulette_read on public.roulette for select to authenticated using (user_id = auth.uid() or partner = auth.uid());
drop policy if exists roulette_leave on public.roulette;
create policy roulette_leave on public.roulette for delete to authenticated using (user_id = auth.uid());

-- ---------- rpc ----------
create or replace function public.create_pod(p_title text, p_topic text default '', p_hours int default 24,
  p_reunion_days int default 14, p_kind text default 'pod') returns public.pods
language plpgsql security definer set search_path = public as $$
declare r pods;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if p_kind not in ('pod', 'agent') then raise exception 'bad pod kind'; end if;
  insert into pods (kind, title, topic, created_by, expires_at, reunion_at)
  values (p_kind, left(trim(p_title), 120), coalesce(p_topic, ''), auth.uid(),
          now() + make_interval(hours => greatest(1, least(coalesce(p_hours, 24), 96))),
          case when coalesce(p_reunion_days, 0) > 0 then now() + make_interval(days => least(p_reunion_days, 60)) end)
  returning * into r;
  insert into pod_members (pod_id, user_id) values (r.id, auth.uid());
  return r;
end $$;

create or replace function public.join_pod(p_code text) returns public.pods
language plpgsql security definer set search_path = public as $$
declare r pods;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into r from pods where code = upper(trim(p_code)) and expires_at > now();
  if not found then raise exception 'no open pod with that code'; end if;
  insert into pod_members (pod_id, user_id) values (r.id, auth.uid())
  on conflict (pod_id, user_id) do update set status = 'joined';
  return r;
end $$;

create or replace function public.open_room(p_key text, p_title text, p_kind text, p_expires timestamptz,
  p_topic text default '') returns public.pods
language plpgsql security definer set search_path = public as $$
declare r pods;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if p_kind not in ('session', 'line') then raise exception 'bad room kind'; end if;
  insert into pods (kind, room_key, title, topic, created_by, expires_at)
  values (p_kind, left(p_key, 200), left(trim(p_title), 120), coalesce(p_topic, ''), auth.uid(),
          least(greatest(p_expires, now() + interval '1 hour'), now() + interval '7 days'))
  on conflict (room_key) do update set room_key = excluded.room_key
  returning * into r;
  insert into pod_members (pod_id, user_id) values (r.id, auth.uid())
  on conflict (pod_id, user_id) do update set status = 'joined';
  return r;
end $$;

create or replace function public.invite_to_pod(p_pod uuid, p_users uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_member(p_pod, true) then raise exception 'join the pod first'; end if;
  insert into pod_members (pod_id, user_id, status)
  select p_pod, u, 'invited' from unnest(p_users[1:12]) u
  where exists (select 1 from profiles where id = u)
  on conflict (pod_id, user_id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.roulette_join(p_round text, p_topics text[] default '{}') returns public.roulette
language plpgsql security definer set search_path = public as $$
declare mine roulette; other roulette;
  spots text[] := array['coffee bar by the main hall', 'registration desk', 'garden room terrace', 'lobby window seats', 'snack table, level 2'];
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  insert into roulette (user_id, round, topics) values (auth.uid(), p_round, coalesce(p_topics, '{}'))
  on conflict (user_id) do update set round = excluded.round, topics = excluded.topics, partner = null, spot = null, joined_at = now();
  select * into other from roulette
   where round = p_round and partner is null and user_id <> auth.uid() and joined_at > now() - interval '2 hours'
   order by cardinality(array(select unnest(topics) intersect select unnest(coalesce(p_topics, '{}')))) desc, joined_at
   limit 1 for update skip locked;
  if found then
    update roulette set partner = auth.uid(), spot = spots[1 + floor(random() * 5)::int] where user_id = other.user_id
    returning spot into other.spot;
    update roulette set partner = other.user_id, spot = other.spot where user_id = auth.uid();
  end if;
  select * into mine from roulette where user_id = auth.uid();
  return mine;
end $$;

create or replace function public.purge_expired() returns void
language sql security definer set search_path = public as $$
  delete from pods where expires_at < now() - interval '1 day'
    and (reunion_at is null or reunion_at < now() - interval '7 days');
  delete from offers where expires_at < now();
  delete from roulette where joined_at < now() - interval '2 hours';
  delete from profiles where expires_at < now();
$$;

revoke execute on function public.purge_expired() from public, anon, authenticated;
grant execute on function public.create_pod(text, text, int, int, text), public.join_pod(text),
  public.open_room(text, text, text, timestamptz, text), public.invite_to_pod(uuid, uuid[]),
  public.roulette_join(text, text[]) to authenticated;

-- realtime: row changes are delivered subject to the select policies above
do $$
declare tb text;
begin
  foreach tb in array array['pods', 'pod_members', 'messages', 'votes', 'offers', 'roulette'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tb);
    exception when others then raise notice 'realtime: %', sqlerrm;
    end;
  end loop;
end $$;

-- hourly cleanup
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('r4-purge-expired', '17 * * * *', 'select public.purge_expired()');
exception when others then
  raise notice 'pg_cron unavailable (%); run select public.purge_expired() periodically', sqlerrm;
end $$;
