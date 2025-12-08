
-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('instant', 'scheduled', 'recurring')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'active', 'paused', 'completed', 'cancelled')),
    schedule_time TIMESTAMPTZ,
    recurrence_rule JSONB,
    audience_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video')),
    media_url TEXT,
    daily_limit INTEGER,
    message_variations TEXT[], -- Array of strings for message variations
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_run_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id)
);

-- Create campaign_logs table
CREATE TABLE IF NOT EXISTS public.campaign_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contatos(id) ON DELETE SET NULL, -- Can be null if contact deleted or direct phone
    phone TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'sent', 'delivered')),
    message_content TEXT,
    details JSONB, -- For error messages or other metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow all for authenticated users for now, matching Contacts pattern)
CREATE POLICY "Enable all for authenticated users on campaigns" 
ON public.campaigns 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users on campaign_logs" 
ON public.campaign_logs 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON public.campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_campaign_id ON public.campaign_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_contact_id ON public.campaign_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_status ON public.campaign_logs(status);
