-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is owner
CREATE OR REPLACE FUNCTION public.is_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = _user_id
      AND email = 'hotclass@dono.com'
  )
$$;

-- RLS Policies for user_roles
-- Only owner can view all roles
CREATE POLICY "Owner can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_owner(auth.uid()) OR user_id = auth.uid());

-- Only owner can insert roles
CREATE POLICY "Owner can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_owner(auth.uid()));

-- Only owner can update roles
CREATE POLICY "Owner can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_owner(auth.uid()));

-- Only owner can delete roles
CREATE POLICY "Owner can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_owner(auth.uid()));