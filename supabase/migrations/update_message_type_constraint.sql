-- Update message_type check constraint to include 'template'
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_message_type_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_message_type_check CHECK (message_type IN ('text', 'image', 'video', 'template'));
