-- 1. Set the current admin as owner (the first admin becomes owner)
UPDATE public.user_roles 
SET role = 'owner' 
WHERE user_id = (
  SELECT user_id FROM public.user_roles 
  WHERE role = 'admin' 
  ORDER BY user_id 
  LIMIT 1
);

-- 2. Create function to check if user is owner
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'owner'
  )
$$;

-- 3. Create trigger function to protect owner role
CREATE OR REPLACE FUNCTION public.protect_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_is_owner boolean;
  target_is_owner boolean;
BEGIN
  -- Check if the current user is the owner
  current_user_is_owner := public.is_owner(auth.uid());
  
  -- For DELETE operations
  IF TG_OP = 'DELETE' THEN
    -- Check if target is owner
    target_is_owner := (OLD.role = 'owner');
    
    -- No one can delete the owner role
    IF target_is_owner THEN
      RAISE EXCEPTION 'Cannot remove the owner role. Transfer ownership first.';
    END IF;
    
    -- Only owner can delete admin roles
    IF OLD.role = 'admin' AND NOT current_user_is_owner THEN
      RAISE EXCEPTION 'Only the owner can remove admin roles.';
    END IF;
    
    RETURN OLD;
  END IF;
  
  -- For UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    -- Check if target was owner
    target_is_owner := (OLD.role = 'owner');
    
    -- Owner cannot demote themselves
    IF target_is_owner AND NEW.role != 'owner' THEN
      RAISE EXCEPTION 'Owner cannot demote themselves. Transfer ownership first.';
    END IF;
    
    -- Only owner can create new owners (transfer ownership)
    IF NEW.role = 'owner' AND NOT current_user_is_owner THEN
      RAISE EXCEPTION 'Only the owner can transfer ownership.';
    END IF;
    
    -- Only owner can demote admins
    IF OLD.role = 'admin' AND NEW.role = 'user' AND NOT current_user_is_owner THEN
      RAISE EXCEPTION 'Only the owner can demote admins.';
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- For INSERT operations
  IF TG_OP = 'INSERT' THEN
    -- Only owner can create owner role
    IF NEW.role = 'owner' AND NOT current_user_is_owner THEN
      RAISE EXCEPTION 'Only the owner can assign owner role.';
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 4. Create the trigger
DROP TRIGGER IF EXISTS protect_owner_role_trigger ON public.user_roles;
CREATE TRIGGER protect_owner_role_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_owner_role();

-- 5. Update has_role function to include owner check for admin operations
-- Owner should pass admin checks too
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR (role = 'owner' AND _role = 'admin'))
  )
$$;