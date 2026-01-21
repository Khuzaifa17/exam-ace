-- Add unique constraint on user_id so upsert with onConflict works
-- This ensures each user can only have one role entry
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);