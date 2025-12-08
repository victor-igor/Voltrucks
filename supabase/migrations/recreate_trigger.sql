-- Recreate Trigger as AFTER INSERT

DROP TRIGGER IF EXISTS on_campaign_insert ON public.campaigns;

CREATE TRIGGER on_campaign_insert
AFTER INSERT
ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.trigger_instant_campaign();
