-- Add ON DELETE CASCADE to campaign_triggers_log foreign key
ALTER TABLE public.campaign_triggers_log
DROP CONSTRAINT IF EXISTS campaign_triggers_log_campaign_id_fkey;

ALTER TABLE public.campaign_triggers_log
ADD CONSTRAINT campaign_triggers_log_campaign_id_fkey
FOREIGN KEY (campaign_id)
REFERENCES public.campaigns(id)
ON DELETE CASCADE;
