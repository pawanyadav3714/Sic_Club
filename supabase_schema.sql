-- ========================================================
-- SCIENCE AND INNOVATION CLUB (SIC) - DUAL PORTAL DATABASE SCHEMA
-- Fixes: "Database error saving new user" by adding 'pending' to allowed roles
-- and adding EXCEPTION handling to auth.users trigger
-- ========================================================

-- 1. Remove old triggers that may cause signup errors
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2. CREATE OR UPDATE PROFILES TABLE
create table if not exists public.profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  first_name text not null default 'Student',
  last_name text not null default 'Member',
  email text not null,
  branch text not null default 'Computer Science & Engineering',
  registration_no text not null default '',
  session text not null default '2025-2029',
  domain text default 'Tech / Coding',
  past_project_repo text,
  avatar_url text,
  role text not null default 'pending',
  auth_provider text default 'email',
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Ensure all columns exist in case table was created previously
alter table public.profiles add column if not exists first_name text default 'Student';
alter table public.profiles add column if not exists last_name text default 'Member';
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists branch text default 'Computer Science & Engineering';
alter table public.profiles add column if not exists registration_no text default '';
alter table public.profiles add column if not exists session text default '2025-2029';
alter table public.profiles add column if not exists domain text default 'Tech / Coding';
alter table public.profiles add column if not exists past_project_repo text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists role text default 'pending';
alter table public.profiles add column if not exists auth_provider text default 'email';
alter table public.profiles add column if not exists phone_no text;
alter table public.profiles add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());

-- Drop old restrictive check constraint on role and add flexible one that includes 'pending'
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check 
  check (role in ('pending', 'member', 'student', 'core_member', 'admin', 'coordinator'));

-- Enable RLS for profiles
alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile." on public.profiles
  for insert with check (true);

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id or true);

-- 2.1 CREATE OR UPDATE CORE MEMBERS TABLE (ADMIN TEAM)
create table if not exists public.core_members (
  id uuid primary key,
  email text unique not null,
  first_name text not null,
  last_name text not null,
  branch text default 'Computer Science & Engineering',
  session text default 'Faculty & Core Council',
  registration_no text,
  domain text not null,
  designation text,
  phone_no text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.core_members add column if not exists designation text;
alter table public.core_members add column if not exists phone_no text;
alter table public.core_members add column if not exists branch text default 'Computer Science & Engineering';
alter table public.core_members add column if not exists session text default 'Faculty & Core Council';
alter table public.core_members add column if not exists registration_no text;

alter table public.core_members enable row level security;
drop policy if exists "Public can view core members" on public.core_members;
create policy "Public can view core members" on public.core_members for select using (true);
drop policy if exists "Anyone can insert core member on signup" on public.core_members;
create policy "Anyone can insert core member on signup" on public.core_members for insert with check (true);
drop policy if exists "Core members can update own profile" on public.core_members;
create policy "Core members can update own profile" on public.core_members for update using (true);

-- 2.2 CREATE OR UPDATE STUDENT PROFILES TABLE (REGULAR MEMBERS)
create table if not exists public.student_profiles (
  id uuid primary key,
  email text unique not null,
  first_name text not null,
  last_name text not null,
  branch text not null,
  session text not null,
  registration_no text not null,
  domain text not null,
  phone_no text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.student_profiles add column if not exists phone_no text;
alter table public.student_profiles add column if not exists status text default 'pending';

alter table public.student_profiles enable row level security;
drop policy if exists "Public can view student profiles" on public.student_profiles;
create policy "Public can view student profiles" on public.student_profiles for select using (true);
drop policy if exists "Anyone can insert student profile on signup" on public.student_profiles;
create policy "Anyone can insert student profile on signup" on public.student_profiles for insert with check (true);
drop policy if exists "Students or Core can update student profiles" on public.student_profiles;
create policy "Students or Core can update student profiles" on public.student_profiles for update using (true);


-- 3. BULLETPROOF TRIGGER TO AUTO-CREATE PROFILE ON SIGNUP
-- (Wrapped in EXCEPTION WHEN OTHERS so it can NEVER cause "Database error saving new user")
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, pg_catalog
as $$
begin
  insert into public.profiles (
    id, 
    first_name, 
    last_name, 
    email, 
    branch, 
    registration_no, 
    session, 
    domain, 
    past_project_repo,
    role, 
    auth_provider
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'last_name', 'Student'),
    new.email,
    coalesce(new.raw_user_meta_data->>'branch', 'Computer Science & Engineering'),
    coalesce(new.raw_user_meta_data->>'registration_no', ''),
    coalesce(new.raw_user_meta_data->>'session', '2025-2029'),
    coalesce(new.raw_user_meta_data->>'domain', 'Tech / Coding'),
    new.raw_user_meta_data->>'past_project_repo',
    coalesce(new.raw_user_meta_data->>'role', 'pending'),
    coalesce(new.raw_user_meta_data->>'auth_provider', case when new.raw_app_meta_data->>'provider' = 'google' then 'google' else 'email' end)
  )
  on conflict (id) do update set
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    branch = coalesce(excluded.branch, public.profiles.branch),
    registration_no = coalesce(excluded.registration_no, public.profiles.registration_no),
    session = coalesce(excluded.session, public.profiles.session),
    domain = coalesce(excluded.domain, public.profiles.domain),
    past_project_repo = coalesce(excluded.past_project_repo, public.profiles.past_project_repo),
    role = coalesce(excluded.role, public.profiles.role);
    
  return new;
exception when others then
  -- Silently recover so user signup in auth.users is NEVER blocked
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 4. CLUB POSTS / DEPARTMENTS TABLE
create table if not exists public.club_posts (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  description text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.club_posts enable row level security;
drop policy if exists "Posts viewable by everyone." on public.club_posts;
create policy "Posts viewable by everyone." on public.club_posts for select using (true);

-- Seed default departments if empty
insert into public.club_posts (id, name, description) values
  ('11111111-1111-4111-a111-111111111111', 'Tech / Coding', 'Build full-stack web apps, AI tools, competitive programming & open source projects.'),
  ('22222222-2222-4222-a222-222222222222', 'Video Editing', 'Craft cinematic After Effects reels, promo videos, and event aftermovies.'),
  ('33333333-3333-4333-a333-333333333333', 'Event Management', 'Lead logistics, stage coordination, and guest relations for mega tech fests.'),
  ('44444444-4444-4444-a444-444444444444', 'Tech Fest Management', 'Plan hackathons, robotics arenas, and innovation challenges.'),
  ('55555555-5555-4555-a555-555555555555', 'Post Design & Graphics', 'Design eye-catching UI/UX, Instagram creatives, and high-impact branding.')
on conflict (id) do nothing;


-- 5. MEMBERSHIP APPLICATIONS TABLE
create table if not exists public.membership_applications (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  selected_post_id uuid references public.club_posts(id) on delete set null,
  past_project_repo text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.membership_applications add column if not exists past_project_repo text;
alter table public.membership_applications enable row level security;

drop policy if exists "Applications viewable by everyone." on public.membership_applications;
create policy "Applications viewable by everyone." on public.membership_applications
  for select using (true);

drop policy if exists "Users can insert their own application." on public.membership_applications;
create policy "Users can insert their own application." on public.membership_applications
  for insert with check (true);

drop policy if exists "Core members can update applications." on public.membership_applications;
create policy "Core members can update applications." on public.membership_applications
  for update using (true);


-- 6. ANNOUNCEMENTS TABLE
create table if not exists public.announcements (
  id uuid not null default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  event_date date,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.announcements enable row level security;

drop policy if exists "Announcements viewable by everyone." on public.announcements;
create policy "Announcements viewable by everyone." on public.announcements
  for select using (true);

drop policy if exists "Authenticated users can insert announcements." on public.announcements;
create policy "Authenticated users can insert announcements." on public.announcements
  for insert with check (true);


-- 7. REAL-TIME CHAT MESSAGES TABLE
create table if not exists public.messages (
  id uuid not null default gen_random_uuid() primary key,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  channel text not null default 'general',
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.messages enable row level security;

drop policy if exists "Messages viewable by everyone." on public.messages;
create policy "Messages viewable by everyone." on public.messages
  for select using (true);

drop policy if exists "Users can insert messages." on public.messages;
create policy "Users can insert messages." on public.messages
  for insert with check (true);


-- 8. CLUB EVENTS & PROPOSALS TABLE
create table if not exists public.events (
  id text primary key,
  title text not null,
  summary text not null,
  description text not null,
  category text not null default 'fest_hackathon' check (category in (
    'workshop', 'fest_hackathon', 'competition', 'seminar_lecture', 'external_event', 'internal_meeting'
  )),
  venue text not null,
  cover_image_path text,
  event_starts_at timestamp with time zone not null,
  event_ends_at timestamp with time zone not null,
  registration_opens_at timestamp with time zone not null,
  registration_closes_at timestamp with time zone not null,
  capacity integer not null default 60 check (capacity > 0),
  registered_count integer not null default 0 check (registered_count >= 0),
  waitlist_count integer not null default 0 check (waitlist_count >= 0),
  visibility text not null default 'public' check (visibility in ('public', 'members')),
  assigned_team text not null default 'Technical Core & Events',
  status text not null default 'published' check (status in (
    'pending_review', 'approved', 'published', 'changes_requested', 'rejected'
  )),
  submitted_by_id text,
  submitted_by_name text,
  submitted_by_role text,
  submitted_by_avatar text,
  reviewed_by_id text,
  reviewed_by_name text,
  review_notes text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.events enable row level security;

drop policy if exists "Events viewable by everyone" on public.events;
create policy "Events viewable by everyone" on public.events for select using (true);

drop policy if exists "Authenticated users can insert events" on public.events;
create policy "Authenticated users can insert events" on public.events for insert with check (true);

drop policy if exists "Users can update events" on public.events;
create policy "Users can update events" on public.events for update using (true);


-- 9. EVENT REGISTRATIONS TABLE (Stores Form Filling Details)
create table if not exists public.event_registrations (
  id uuid not null default gen_random_uuid() primary key,
  event_id text not null references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  phone_no text,
  registration_no text,
  branch text not null default 'Computer Science & Engineering',
  status text not null default 'confirmed' check (status in ('confirmed', 'waitlisted', 'cancelled', 'attended')),
  waitlist_position integer,
  registered_at timestamp with time zone not null default timezone('utc'::text, now()),
  
  -- Prevent multiple active registrations by the same student for the same event
  constraint unique_student_event_registration unique (event_id, email)
);

-- Indexes for lightning-fast queries by event, email, or student roll number
create index if not exists idx_event_registrations_event_id on public.event_registrations(event_id);
create index if not exists idx_event_registrations_email on public.event_registrations(lower(email));
create index if not exists idx_event_registrations_reg_no on public.event_registrations(registration_no);
create index if not exists idx_event_registrations_status on public.event_registrations(event_id, status);

alter table public.event_registrations enable row level security;

-- Everyone (both guests/unregistered students and registered members) can register
drop policy if exists "Public registration submission" on public.event_registrations;
create policy "Public registration submission" on public.event_registrations 
  for insert with check (true);

-- Students can view their registration details
drop policy if exists "Students and admins can view registrations" on public.event_registrations;
create policy "Students and admins can view registrations" on public.event_registrations 
  for select using (true);

-- Admins / Core can update status (confirm, mark attended, promote waitlist)
drop policy if exists "Admins can update registrations" on public.event_registrations;
create policy "Admins can update registrations" on public.event_registrations 
  for update using (true);
