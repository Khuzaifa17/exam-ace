-- Enable RLS on questions_public view (if not already)
ALTER VIEW public.questions_public SET (security_invoker = false);

-- Drop existing view and recreate WITHOUT security_invoker so it uses definer permissions
DROP VIEW IF EXISTS public.questions_public;

-- Recreate view WITHOUT security_invoker (uses owner permissions)
CREATE VIEW public.questions_public AS
SELECT 
  id,
  content_node_id,
  text1,
  option1,
  option2,
  option3,
  option4,
  explanation,
  difficulty,
  year,
  source,
  created_at,
  updated_at
FROM public.questions;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.questions_public TO authenticated;
GRANT SELECT ON public.questions_public TO anon;