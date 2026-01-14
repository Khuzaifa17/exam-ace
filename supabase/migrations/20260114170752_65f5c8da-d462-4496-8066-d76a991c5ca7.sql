-- Create a secure view for questions that hides correct_option from regular users
CREATE VIEW public.questions_public
WITH (security_invoker=on) AS
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
  -- NOTE: correct_option is intentionally excluded to prevent cheating

-- Drop existing SELECT policies on questions table
DROP POLICY IF EXISTS "Authenticated users can view questions" ON public.questions;

-- Create new restrictive policy - only admins can directly read from questions table
CREATE POLICY "Only admins can directly read questions"
ON public.questions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.questions_public TO authenticated;

-- Create a function to check answer (so correct_option never leaves the server)
CREATE OR REPLACE FUNCTION public.check_answer(question_id UUID, selected_option INTEGER)
RETURNS TABLE (is_correct BOOLEAN, correct_option INTEGER, explanation TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (q.correct_option = selected_option) AS is_correct,
    q.correct_option,
    q.explanation
  FROM public.questions q
  WHERE q.id = question_id;
END;
$$;

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.check_answer(UUID, INTEGER) TO authenticated;