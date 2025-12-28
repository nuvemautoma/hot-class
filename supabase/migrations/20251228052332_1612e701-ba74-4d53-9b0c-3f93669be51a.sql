-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  email_changed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create authorized_ips table (max 3 IPs per user + extras via unlock)
CREATE TABLE public.authorized_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ip_address TEXT NOT NULL,
  is_extra_slot BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, ip_address)
);

-- Enable RLS on authorized_ips
ALTER TABLE public.authorized_ips ENABLE ROW LEVEL SECURITY;

-- Authorized IPs policies
CREATE POLICY "Users can view their own IPs"
ON public.authorized_ips FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own IPs"
ON public.authorized_ips FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own IPs"
ON public.authorized_ips FOR DELETE
USING (auth.uid() = user_id);

-- Create IP unlock slots table (tracks extra IP slots unlocked with password)
CREATE TABLE public.ip_unlock_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ip_unlock_slots
ALTER TABLE public.ip_unlock_slots ENABLE ROW LEVEL SECURITY;

-- IP unlock slots policies
CREATE POLICY "Users can view their own unlock slots"
ON public.ip_unlock_slots FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unlock slots"
ON public.ip_unlock_slots FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create password reset codes table
CREATE TABLE public.password_reset_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on password_reset_codes
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Password reset codes policies
CREATE POLICY "Users can view their own codes"
ON public.password_reset_codes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own codes"
ON public.password_reset_codes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own codes"
ON public.password_reset_codes FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', ''), NEW.email);
  RETURN NEW;
END;
$$;

-- Create trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for profiles timestamp
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for authorized_ips
ALTER PUBLICATION supabase_realtime ADD TABLE public.authorized_ips;