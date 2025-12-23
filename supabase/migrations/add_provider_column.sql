-- Add provider column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'official' CHECK (provider IN ('official', 'unofficial'));

-- Add comment
COMMENT ON COLUMN public.campaigns.provider IS 'Determines the sending channel: official (Meta API) or unofficial (Gateway)';
