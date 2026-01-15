-- 1. Revoke anonymous access to questions_public view
-- This prevents unauthenticated users from querying the question bank
REVOKE SELECT ON public.questions_public FROM anon;

-- 2. Add policy to explicitly deny anonymous access to profiles
-- This prevents potential enumeration of user emails/names
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);