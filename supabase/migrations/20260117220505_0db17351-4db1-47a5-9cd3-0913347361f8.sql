-- Create table to track user terms acceptance
CREATE TABLE public.user_terms_acceptance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  terms_version text NOT NULL DEFAULT '1.0'
);

-- Enable RLS
ALTER TABLE public.user_terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptance
CREATE POLICY "Users can view their own acceptance"
ON public.user_terms_acceptance
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own acceptance
CREATE POLICY "Users can insert their own acceptance"
ON public.user_terms_acceptance
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Owner can view all acceptances
CREATE POLICY "Owner can view all acceptances"
ON public.user_terms_acceptance
FOR SELECT
USING (is_owner(auth.uid()));

-- Insert default terms content into app_settings
INSERT INTO public.app_settings (key, value) 
VALUES ('terms_content', 'Bem-vindo à plataforma Hotfy! Ao utilizar nossos serviços, você concorda com nossos termos e condições de uso.')
ON CONFLICT (key) DO NOTHING;