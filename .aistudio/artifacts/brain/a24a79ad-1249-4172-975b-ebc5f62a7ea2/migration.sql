-- ========================================================
-- PERMANENT SCHEMA FIX: Unified Event Announcements Table
-- ========================================================

-- 1. Create the correct table if it doesn't exist with ALL necessary columns
CREATE TABLE IF NOT EXISTS public.event_announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    description TEXT NOT NULL,
    category TEXT,
    venue TEXT,
    cover_image_path TEXT,
    event_starts_at TEXT,
    event_ends_at TEXT,
    registration_opens_at TEXT,
    registration_closes_at TEXT,
    capacity INTEGER DEFAULT 60,
    registered_count INTEGER DEFAULT 0,
    waitlist_count INTEGER DEFAULT 0,
    visibility TEXT DEFAULT 'public',
    assigned_team TEXT,
    status TEXT DEFAULT 'published',
    submitted_by_id TEXT,
    submitted_by_name TEXT,
    submitted_by_role TEXT,
    author_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Ensure RLS is enabled
ALTER TABLE public.event_announcements ENABLE ROW LEVEL SECURITY;

-- 3. Set policies
DROP POLICY IF EXISTS "Anyone can view event announcements" ON public.event_announcements;
CREATE POLICY "Anyone can view event announcements" ON public.event_announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert event announcements" ON public.event_announcements;
CREATE POLICY "Anyone can insert event announcements" ON public.event_announcements FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update event announcements" ON public.event_announcements;
CREATE POLICY "Anyone can update event announcements" ON public.event_announcements FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete event announcements" ON public.event_announcements;
CREATE POLICY "Anyone can delete event announcements" ON public.event_announcements FOR DELETE USING (true);

ALTER TABLE public.event_announcements ADD COLUMN IF NOT EXISTS problem_statements TEXT[];

-- 4. Update Event Registrations Table
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS registration_type TEXT DEFAULT 'individual';
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS team_name TEXT;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS team_members JSONB;
