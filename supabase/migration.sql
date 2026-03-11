-- ═══════════════════════════════════════════════════════════════
-- ACTIVE HEALTH FIT — Supabase Schema
-- Run this in Supabase SQL Editor (one-time setup)
-- ═══════════════════════════════════════════════════════════════

-- ── Profiles (extends auth.users) ──
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('owner', 'trainer', 'client')),
  avatar_url text,
  created_at timestamptz default now()
);

-- ── Clients (the core roster — not all clients need a login) ──
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  full_name text not null,
  email text,
  start_date date not null default current_date,
  plan text default '',
  status text not null default 'active' check (status in ('active', 'inactive', 'paused')),
  next_session text default '',
  goals text[] default '{}',
  created_at timestamptz default now()
);

-- ── Programs (one per client per week/block) ──
create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  week_label text not null,
  phase text default '',
  week_number int default 1,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ── Program Days ──
create table if not exists program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  day_name text not null,
  date_label text default '',
  focus text default '',
  completed boolean default false,
  sort_order int default 0
);

-- ── Program Blocks (Warm-Up, Main Lifts, Accessories, etc.) ──
create table if not exists program_blocks (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references program_days(id) on delete cascade,
  label text not null,
  sort_order int default 0
);

-- ── Program Exercises ──
create table if not exists program_exercises (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references program_blocks(id) on delete cascade,
  name text not null,
  sets text default '',
  reps text default '',
  load text default '',
  note text default '',
  sort_order int default 0
);

-- ── Assessments ──
create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  assessed_date date not null default current_date,
  type text not null default 'Assessment',
  assessor text default '',
  summary text default '',
  created_at timestamptz default now()
);

-- ── Assessment Metrics ──
create table if not exists assessment_metrics (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  name text not null,
  prev_value numeric,
  current_value numeric not null,
  unit text default '',
  change_label text default '',
  flag text default 'baseline' check (flag in ('improved', 'stable', 'noise', 'declined', 'baseline')),
  sort_order int default 0
);

-- ── Progress Snapshots (monthly tracking) ──
create table if not exists progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  month text not null,
  data jsonb not null default '{}',
  created_at timestamptz default now()
);

-- ── Hours Log (Kristin's time tracking) ──
create table if not exists hours_log (
  id uuid primary key default gen_random_uuid(),
  logged_date date not null default current_date,
  client_id uuid references clients(id) on delete set null,
  entry_type text not null check (entry_type in ('training', 'programming', 'admin', 'kinstretch')),
  hours numeric not null default 0,
  note text default '',
  logged_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ── Training Logs (weekly volume) ──
create table if not exists training_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  week text not null,
  sessions int default 0,
  volume numeric default 0,
  created_at timestamptz default now()
);

-- ── Notes ──
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  author_name text not null,
  content text not null,
  created_at timestamptz default now()
);

-- ── Exercise Library ──
create table if not exists exercises (
  id text primary key,
  name text not null,
  category text not null,
  video_url text,
  created_at timestamptz default now()
);

-- ── Attachments ──
create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  program_id uuid references programs(id) on delete set null,
  file_name text not null,
  file_url text not null,
  file_type text default '',
  file_size text default '',
  uploaded_by uuid references profiles(id),
  created_at timestamptz default now()
);


-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

alter table profiles enable row level security;
alter table clients enable row level security;
alter table programs enable row level security;
alter table program_days enable row level security;
alter table program_blocks enable row level security;
alter table program_exercises enable row level security;
alter table assessments enable row level security;
alter table assessment_metrics enable row level security;
alter table progress_snapshots enable row level security;
alter table training_logs enable row level security;
alter table notes enable row level security;
alter table exercises enable row level security;
alter table attachments enable row level security;
alter table hours_log enable row level security;

-- Helper: get current user's role
create or replace function get_user_role()
returns text as $$
  select role from profiles where id = auth.uid()
$$ language sql security definer stable;

-- Helper: get current user's client_id (if they're a client)
create or replace function get_user_client_id()
returns uuid as $$
  select c.id from clients c where c.profile_id = auth.uid() limit 1
$$ language sql security definer stable;


-- ── Profiles: users can read their own, owner/trainer see all ──
create policy "Users read own profile"
  on profiles for select using (
    id = auth.uid() or get_user_role() in ('owner', 'trainer')
  );

create policy "Users update own profile"
  on profiles for update using (id = auth.uid());

-- ── Clients: owner/trainer see all, client sees own ──
create policy "Staff read all clients"
  on clients for select using (
    get_user_role() in ('owner', 'trainer') or profile_id = auth.uid()
  );

create policy "Owner manages clients"
  on clients for all using (get_user_role() = 'owner');

create policy "Trainer manages clients"
  on clients for insert with check (get_user_role() = 'trainer');

create policy "Trainer updates clients"
  on clients for update using (get_user_role() = 'trainer');

-- ── Programs: owner/trainer full access, client reads own ──
create policy "Staff read all programs"
  on programs for select using (
    get_user_role() in ('owner', 'trainer')
    or client_id = get_user_client_id()
  );

create policy "Staff manage programs"
  on programs for all using (get_user_role() in ('owner', 'trainer'));

-- ── Program Days ──
create policy "Read program days"
  on program_days for select using (
    get_user_role() in ('owner', 'trainer')
    or program_id in (select id from programs where client_id = get_user_client_id())
  );

create policy "Staff manage program days"
  on program_days for all using (get_user_role() in ('owner', 'trainer'));

-- ── Program Blocks ──
create policy "Read program blocks"
  on program_blocks for select using (
    get_user_role() in ('owner', 'trainer')
    or day_id in (
      select pd.id from program_days pd
      join programs p on pd.program_id = p.id
      where p.client_id = get_user_client_id()
    )
  );

create policy "Staff manage program blocks"
  on program_blocks for all using (get_user_role() in ('owner', 'trainer'));

-- ── Program Exercises ──
create policy "Read program exercises"
  on program_exercises for select using (
    get_user_role() in ('owner', 'trainer')
    or block_id in (
      select pb.id from program_blocks pb
      join program_days pd on pb.day_id = pd.id
      join programs p on pd.program_id = p.id
      where p.client_id = get_user_client_id()
    )
  );

create policy "Staff manage program exercises"
  on program_exercises for all using (get_user_role() in ('owner', 'trainer'));

-- ── Assessments ──
create policy "Read assessments"
  on assessments for select using (
    get_user_role() in ('owner', 'trainer')
    or client_id = get_user_client_id()
  );

create policy "Staff manage assessments"
  on assessments for all using (get_user_role() in ('owner', 'trainer'));

-- ── Assessment Metrics ──
create policy "Read assessment metrics"
  on assessment_metrics for select using (
    get_user_role() in ('owner', 'trainer')
    or assessment_id in (select id from assessments where client_id = get_user_client_id())
  );

create policy "Staff manage assessment metrics"
  on assessment_metrics for all using (get_user_role() in ('owner', 'trainer'));

-- ── Progress ──
create policy "Read progress"
  on progress_snapshots for select using (
    get_user_role() in ('owner', 'trainer')
    or client_id = get_user_client_id()
  );

create policy "Staff manage progress"
  on progress_snapshots for all using (get_user_role() in ('owner', 'trainer'));

-- ── Training Logs ──
create policy "Read training logs"
  on training_logs for select using (
    get_user_role() in ('owner', 'trainer')
    or client_id = get_user_client_id()
  );

create policy "Staff manage training logs"
  on training_logs for all using (get_user_role() in ('owner', 'trainer'));

-- ── Hours Log: trainer can insert/read own, owner reads all ──
create policy "Owner reads all hours"
  on hours_log for select using (get_user_role() = 'owner');

create policy "Trainer reads own hours"
  on hours_log for select using (logged_by = auth.uid());

create policy "Trainer logs hours"
  on hours_log for insert with check (get_user_role() in ('owner', 'trainer'));

create policy "Owner manages hours"
  on hours_log for all using (get_user_role() = 'owner');

-- ── Notes ──
create policy "Read notes"
  on notes for select using (
    get_user_role() in ('owner', 'trainer')
    or client_id = get_user_client_id()
  );

create policy "Staff manage notes"
  on notes for all using (get_user_role() in ('owner', 'trainer'));

-- ── Exercises: everyone can read ──
create policy "Everyone reads exercises"
  on exercises for select using (true);

create policy "Staff manage exercises"
  on exercises for all using (get_user_role() in ('owner', 'trainer'));

-- ── Attachments ──
create policy "Read attachments"
  on attachments for select using (
    get_user_role() in ('owner', 'trainer')
    or client_id = get_user_client_id()
  );

create policy "Staff manage attachments"
  on attachments for all using (get_user_role() in ('owner', 'trainer'));


-- ═══════════════════════════════════════════════════════════════
-- AUTO-CREATE PROFILE ON SIGNUP
-- ═══════════════════════════════════════════════════════════════

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'client'  -- default role, owner changes manually
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ═══════════════════════════════════════════════════════════════
-- SEED: Exercise Library
-- ═══════════════════════════════════════════════════════════════

insert into exercises (id, name, category) values
  ('rdl', 'Barbell RDL', 'Hinge'),
  ('bss', 'Bulgarian Split Squat', 'Squat'),
  ('hip-thrust', 'Hip Thrust', 'Hinge'),
  ('dead-bug', 'Dead Bug w/ Band', 'Core'),
  ('shoulder-cars', 'Shoulder CARs', 'Mobility'),
  ('hip-switches', '90/90 Hip Switches', 'Mobility'),
  ('hip-cars', 'Hip CARs', 'Mobility'),
  ('clamshell', 'Banded Clamshell', 'Activation'),
  ('db-bench', 'DB Bench Press', 'Push'),
  ('cable-row', 'Cable Row', 'Pull'),
  ('landmine', 'Landmine Press', 'Push'),
  ('pallof', 'Pallof Press', 'Core'),
  ('face-pull', 'Face Pull', 'Pull'),
  ('farmer-carry', 'Farmer Carry', 'Carry'),
  ('calf-raise', 'Single-Leg Calf Raise', 'Isolation'),
  ('pull-apart', 'Band Pull-Apart', 'Activation'),
  ('goblet-squat', 'Goblet Squat', 'Squat'),
  ('sl-rdl', 'Single-Leg RDL', 'Hinge'),
  ('step-up', 'Step-Up', 'Squat'),
  ('box-jump', 'Box Jump', 'Power'),
  ('trap-bar-dl', 'Trap Bar Deadlift', 'Hinge'),
  ('push-up', 'Push-Up', 'Push'),
  ('plank', 'Plank', 'Core'),
  ('spine-cars', 'Spine CARs', 'Mobility'),
  ('90-90-pails', '90/90 PAILs/RAILs', 'Mobility')
on conflict (id) do nothing;


-- ═══════════════════════════════════════════════════════════════
-- STORAGE BUCKET (for PDF/image uploads)
-- ═══════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict do nothing;

create policy "Staff upload attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and (select get_user_role()) in ('owner', 'trainer')
  );

create policy "Everyone reads attachments"
  on storage.objects for select
  using (bucket_id = 'attachments');


-- ═══════════════════════════════════════════════════════════════
-- USER SETUP (run AFTER migration)
-- ═══════════════════════════════════════════════════════════════
-- Create users via Supabase Dashboard > Authentication > Users > "Add user"
-- Use email + password method. Set password to "AHF" for all users.
--
-- Staff accounts to create:
--   1. damir@activehealthchicago.com  (password: AHF)
--   2. kristin@activehealthchicago.com (password: AHF)
--
-- After creating users, update their profiles to set correct roles:
--
-- UPDATE profiles SET role = 'owner', full_name = 'Dr. Simunac'
--   WHERE email = 'damir@activehealthchicago.com';
--
-- UPDATE profiles SET role = 'trainer', full_name = 'Kristin'
--   WHERE email = 'kristin@activehealthchicago.com';
--
-- For each client, create them via Dashboard with their email + password "AHF",
-- then link them:
--
-- UPDATE profiles SET role = 'client', full_name = 'Sarah Mitchell'
--   WHERE email = 'sarah.m@gmail.com';
--
-- UPDATE clients SET profile_id = (SELECT id FROM profiles WHERE email = 'sarah.m@gmail.com')
--   WHERE full_name = 'Sarah Mitchell';
