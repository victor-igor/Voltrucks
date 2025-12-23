CREATE OR REPLACE FUNCTION public.process_campaign_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  campaign_record RECORD;
  webhook_url TEXT := 'https://workflow.voltruckscaminhoes.com.br/webhook/disparo';
  request_id bigint;
  timezone_br TEXT := 'America/Sao_Paulo';
BEGIN
  
  -- ========================================
  -- 1. PROCESSAR CAMPANHAS ÚNICAS (INSTANT E SCHEDULED)
  -- Status: 'pending' -> 'completed'
  -- ========================================
  FOR campaign_record IN
    SELECT * FROM public.campaigns
    WHERE 
      status = 'pending'
      AND (
        (type = 'scheduled' AND schedule_time IS NOT NULL AND schedule_time <= NOW())
        OR
        (type = 'instant')
      )
    ORDER BY 
      CASE WHEN type = 'instant' THEN 1 ELSE 2 END,
      COALESCE(schedule_time, created_at) ASC
  LOOP
    BEGIN
      SELECT net.http_post(
        url := webhook_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'campaign_id', campaign_record.id,
          'name', campaign_record.name,
          'type', campaign_record.type,
          'audience_filter', campaign_record.audience_filter,
          'provider', campaign_record.provider, -- Added provider
          'message_type', campaign_record.message_type,
          'media_url', campaign_record.media_url,
          'daily_limit', campaign_record.daily_limit,
          'message_variations', campaign_record.message_variations,
          'template_name', campaign_record.template_name,
          'template_language', campaign_record.template_language,
          'template_text', campaign_record.template_text,
          'target_time', COALESCE(campaign_record.schedule_time, NOW()),
          'triggered_at', NOW()
        )
      ) INTO request_id;

      UPDATE public.campaigns
      SET status = 'completed', last_run_at = NOW()
      WHERE id = campaign_record.id;

      INSERT INTO public.campaign_triggers_log (campaign_id, status, response)
      VALUES (campaign_record.id, 'success', jsonb_build_object('request_id', request_id, 'type', campaign_record.type, 'provider', campaign_record.provider));

    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.campaign_triggers_log (campaign_id, status, error_message)
      VALUES (campaign_record.id, 'error', SQLERRM);
    END;
  END LOOP;

  -- ========================================
  -- 2. PROCESSAR CAMPANHAS RECORRENTES
  -- Status: 'active' (não muda para completed)
  -- ========================================
  FOR campaign_record IN
    SELECT * FROM public.campaigns
    WHERE 
      status = 'active'
      AND type = 'recurring'
      AND recurrence_rule IS NOT NULL
      AND (last_run_at IS NULL OR (last_run_at AT TIME ZONE timezone_br)::date < (NOW() AT TIME ZONE timezone_br)::date)
      AND recurrence_rule->'days' @> to_jsonb(EXTRACT(DOW FROM (NOW() AT TIME ZONE timezone_br))::int)
    ORDER BY created_at ASC
  LOOP
    BEGIN
      DECLARE
        current_time_br TEXT := TO_CHAR(NOW() AT TIME ZONE timezone_br, 'HH24:MI');
        times_array jsonb := campaign_record.recurrence_rule->'times';
        should_trigger BOOLEAN := FALSE;
        time_slot TEXT;
      BEGIN
        FOR time_slot IN SELECT jsonb_array_elements_text(times_array)
        LOOP
          IF current_time_br = time_slot THEN
            should_trigger := TRUE;
            EXIT;
          END IF;
        END LOOP;

        IF NOT should_trigger THEN
          CONTINUE;
        END IF;
      END;

      -- DISPARO RECORRENTE COM TODOS OS CAMPOS
      SELECT net.http_post(
        url := webhook_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'campaign_id', campaign_record.id,
          'name', campaign_record.name,
          'type', campaign_record.type,
          'audience_filter', campaign_record.audience_filter,
          'provider', campaign_record.provider, -- Added provider
          'message_type', campaign_record.message_type,
          'media_url', campaign_record.media_url,
          'daily_limit', campaign_record.daily_limit,
          'message_variations', campaign_record.message_variations,
          'template_name', campaign_record.template_name,
          'template_language', campaign_record.template_language,
          'template_text', campaign_record.template_text,
          -- Campos de controle
          'recurrence_rule', campaign_record.recurrence_rule,
          'target_time', NOW(),
          'triggered_at', NOW()
        )
      ) INTO request_id;

      UPDATE public.campaigns
      SET last_run_at = NOW()
      WHERE id = campaign_record.id;

      INSERT INTO public.campaign_triggers_log (campaign_id, status, response)
      VALUES (campaign_record.id, 'success', jsonb_build_object('request_id', request_id, 'type', 'recurring', 'provider', campaign_record.provider));

    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.campaign_triggers_log (campaign_id, status, error_message)
      VALUES (campaign_record.id, 'error', SQLERRM);
    END;
  END LOOP;

END;
$$;
