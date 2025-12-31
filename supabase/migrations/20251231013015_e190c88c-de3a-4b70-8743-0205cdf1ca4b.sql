-- Owner visibility/management policies for admin panel

-- PROFILES: allow owner to view and update any profile (still allow users to view/update their own)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Owner can view all profiles'
  ) THEN
    CREATE POLICY "Owner can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (public.is_owner(auth.uid()) OR auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Owner can update any profile'
  ) THEN
    CREATE POLICY "Owner can update any profile"
    ON public.profiles
    FOR UPDATE
    USING (public.is_owner(auth.uid()) OR auth.uid() = user_id);
  END IF;
END $$;

-- AUTHORIZED_IPS: allow owner to view all device IPs for reporting
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'authorized_ips'
      AND policyname = 'Owner can view all IPs'
  ) THEN
    CREATE POLICY "Owner can view all IPs"
    ON public.authorized_ips
    FOR SELECT
    USING (public.is_owner(auth.uid()) OR auth.uid() = user_id);
  END IF;
END $$;