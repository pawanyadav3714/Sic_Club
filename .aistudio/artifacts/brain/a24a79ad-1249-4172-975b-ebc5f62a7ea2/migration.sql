-- Create Direct Messages Table
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    sender_avatar TEXT,
    recipient_id TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    media_name TEXT,
    media_type TEXT,
    link_url TEXT,
    link_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'sent'
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own direct messages" ON public.direct_messages;
CREATE POLICY "Users can view own direct messages" ON public.direct_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own direct messages" ON public.direct_messages;
CREATE POLICY "Users can insert own direct messages" ON public.direct_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own direct messages" ON public.direct_messages;
CREATE POLICY "Users can update own direct messages" ON public.direct_messages FOR UPDATE USING (true);
