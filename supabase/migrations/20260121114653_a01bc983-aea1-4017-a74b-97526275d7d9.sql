-- Create user_plans table for subscription management
CREATE TABLE public.user_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('mensal', 'trimestral', 'vitalicio')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own plan"
ON public.user_plans
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owner can view all plans"
ON public.user_plans
FOR SELECT
USING (is_owner(auth.uid()));

CREATE POLICY "Owner can insert plans"
ON public.user_plans
FOR INSERT
WITH CHECK (is_owner(auth.uid()));

CREATE POLICY "Owner can update plans"
ON public.user_plans
FOR UPDATE
USING (is_owner(auth.uid()));

CREATE POLICY "Owner can delete plans"
ON public.user_plans
FOR DELETE
USING (is_owner(auth.uid()));

-- Service role policy for webhook (bypass RLS for service role)
CREATE POLICY "Service role can manage plans"
ON public.user_plans
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_user_plans_updated_at
BEFORE UPDATE ON public.user_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Mark all existing users as vitalício/active
INSERT INTO public.user_plans (user_id, plan_type, status, expires_at)
SELECT user_id, 'vitalicio', 'active', NULL
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;