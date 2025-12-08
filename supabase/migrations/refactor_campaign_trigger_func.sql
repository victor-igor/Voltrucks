-- Refactor Trigger to Context: AFTER INSERT to solve FK issue

-- 1. Drop existing trigger (we need the name from previous step, but assuming distinct naming or just dropping by function if possible, but triggers belong to tables)
-- I will use dynamic SQL or just replace based on name found.
-- Assuming name is 'on_campaign_created' or similar. 
-- For now, let's redefine the function first, then drop/create trigger.

CREATE OR REPLACE FUNCTION public.trigger_instant_campaign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_url TEXT := 'https://workflow.voltruckscaminhoes.com.br/webhook/disparo';
  request_id bigint;
BEGIN
  -- Logic for AFTER INSERT
  -- Only process if INSTANT and PENDING
  IF NEW.type = 'instant' AND NEW.status = 'pending' THEN
    BEGIN
      -- 1. Fire Webhook
      SELECT net.http_post(
        url := webhook_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'campaign_id', NEW.id,
          'name', NEW.name,
          'type', NEW.type,
          'audience_filter', NEW.audience_filter,
          'message_type', NEW.message_type,
          'media_url', NEW.media_url,
          'daily_limit', NEW.daily_limit,
          'message_variations', NEW.message_variations,
          'template_name', NEW.template_name,
          'template_language', NEW.template_language,
          'target_time', NOW(),
          'triggered_at', NOW()
        )
      ) INTO request_id;

      -- 2. Log Success (Now safe because row exists)
      INSERT INTO public.campaign_triggers_log (campaign_id, status, response)
      VALUES (NEW.id, 'success', jsonb_build_object('request_id', request_id, 'type', 'instant', 'trigger', 'on_insert'));

      -- 3. Update Status to Completed
      -- This UPDATE will perform a new write. Ensure no infinite loop.
      UPDATE public.campaigns 
      SET status = 'completed', last_run_at = NOW() 
      WHERE id = NEW.id;

    EXCEPTION WHEN OTHERS THEN
      -- Log Error
      INSERT INTO public.campaign_triggers_log (campaign_id, status, error_message)
      VALUES (NEW.id, 'error', SQLERRM);
      -- We don't re-raise error to avoid failing the transaction? 
      -- But if we don't, the campaign stays 'pending' but creation succeeds.
      -- User might prefer to know it failed.
      -- But for 'instant', maybe better to fail?
      -- The original code swallowed error (RAISE WARNING).
      RAISE WARNING 'Erro ao disparar campanha instant %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;
