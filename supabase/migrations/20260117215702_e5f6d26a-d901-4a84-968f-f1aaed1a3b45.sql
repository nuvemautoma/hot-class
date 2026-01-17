-- Create table to store the disparador redirect link (only one row needed)
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can view settings"
ON public.app_settings
FOR SELECT
USING (true);

-- Only owner can insert settings
CREATE POLICY "Owner can insert settings"
ON public.app_settings
FOR INSERT
WITH CHECK (is_owner(auth.uid()));

-- Only owner can update settings
CREATE POLICY "Owner can update settings"
ON public.app_settings
FOR UPDATE
USING (is_owner(auth.uid()));

-- Only owner can delete settings
CREATE POLICY "Owner can delete settings"
ON public.app_settings
FOR DELETE
USING (is_owner(auth.uid()));

-- Insert default disparador link
INSERT INTO public.app_settings (key, value) VALUES ('disparador_link', 'https://example.com');