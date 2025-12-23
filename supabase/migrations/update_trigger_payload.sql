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
          'provider', NEW.provider, -- Added provider field
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
      VALUES (NEW.id, 'success', jsonb_build_object('request_id', request_id, 'type', 'instant', 'trigger', 'on_insert', 'provider', NEW.provider));

      -- 3. Update Status to Completed
      -- This UPDATE will perform a new write. Ensure no infinite loop.
      UPDATE public.campaigns 
      SET status = 'completed', last_run_at = NOW() 
      WHERE id = NEW.id;

    EXCEPTION WHEN OTHERS THEN
      -- Log Error
      INSERT INTO public.campaign_triggers_log (campaign_id, status, error_message)
      VALUES (NEW.id, 'error', SQLERRM);
      
      RAISE WARNING 'Erro ao disparar campanha instant %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;
