-- Add demo_questions_limit to content_nodes for chapter-level control
ALTER TABLE public.content_nodes 
ADD COLUMN demo_questions_limit INTEGER NOT NULL DEFAULT 10;

-- Add comment for documentation
COMMENT ON COLUMN public.content_nodes.demo_questions_limit IS 'Number of demo questions allowed for this content node (primarily used for CHAPTER nodes)';