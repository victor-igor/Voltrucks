-- Add template fields to campaigns table
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS template_name text,
ADD COLUMN IF NOT EXISTS template_language text;
