-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  link TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Groups are viewable by all authenticated users
CREATE POLICY "Authenticated users can view groups"
ON public.groups
FOR SELECT
TO authenticated
USING (true);

-- Only owner can insert groups
CREATE POLICY "Owner can insert groups"
ON public.groups
FOR INSERT
WITH CHECK (is_owner(auth.uid()));

-- Only owner can update groups
CREATE POLICY "Owner can update groups"
ON public.groups
FOR UPDATE
USING (is_owner(auth.uid()));

-- Only owner can delete groups
CREATE POLICY "Owner can delete groups"
ON public.groups
FOR DELETE
USING (is_owner(auth.uid()));

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_user_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications or global ones (target_user_id is null)
CREATE POLICY "Users can view their notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (target_user_id IS NULL OR target_user_id = auth.uid() OR is_owner(auth.uid()));

-- Only owner can insert notifications
CREATE POLICY "Owner can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (is_owner(auth.uid()));

-- Only owner can delete notifications
CREATE POLICY "Owner can delete notifications"
ON public.notifications
FOR DELETE
USING (is_owner(auth.uid()));

-- Create admin_logs table
CREATE TABLE public.admin_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  admin_id UUID NOT NULL,
  admin_name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Only owner can view logs
CREATE POLICY "Owner can view logs"
ON public.admin_logs
FOR SELECT
USING (is_owner(auth.uid()));

-- Owner and admins can insert logs
CREATE POLICY "Owner and admins can insert logs"
ON public.admin_logs
FOR INSERT
WITH CHECK (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- Create trigger for groups updated_at
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();