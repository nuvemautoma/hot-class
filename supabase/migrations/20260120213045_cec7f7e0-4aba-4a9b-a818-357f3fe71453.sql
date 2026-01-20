-- Create table to track users with unlocked groups
CREATE TABLE public.user_group_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unlocked_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_group_unlocks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own unlock status"
ON public.user_group_unlocks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owner can view all unlocks"
ON public.user_group_unlocks
FOR SELECT
USING (is_owner(auth.uid()));

CREATE POLICY "Owner can insert unlocks"
ON public.user_group_unlocks
FOR INSERT
WITH CHECK (is_owner(auth.uid()));

CREATE POLICY "Owner can delete unlocks"
ON public.user_group_unlocks
FOR DELETE
USING (is_owner(auth.uid()));