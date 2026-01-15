-- Create table to track demo usage per user per exam
CREATE TABLE public.demo_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  demo_completed BOOLEAN NOT NULL DEFAULT false,
  questions_attempted INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, exam_id)
);

-- Enable RLS
ALTER TABLE public.demo_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own demo usage
CREATE POLICY "Users can view their own demo usage"
ON public.demo_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own demo usage
CREATE POLICY "Users can insert their own demo usage"
ON public.demo_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own demo usage
CREATE POLICY "Users can update their own demo usage"
ON public.demo_usage
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_demo_usage_updated_at
BEFORE UPDATE ON public.demo_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();