-- Alter message_variations to JSONB
-- Convert existing text[] arrays to jsonb arrays
ALTER TABLE public.campaigns
ALTER COLUMN message_variations
SET DATA TYPE JSONB
USING to_jsonb(message_variations);
