import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ExamAccessResult {
  hasSubscription: boolean;
  demoCompleted: boolean;
  demoQuestionsLimit: number;
  canAccess: boolean;
  isLoading: boolean;
  markDemoComplete: () => void;
}

export const useExamAccess = (examId: string | null, chapterId?: string | null): ExamAccessResult => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch chapter-level demo limit (if chapterId provided) or exam-level fallback
  const { data: demoLimit } = useQuery({
    queryKey: ['demo-limit', examId, chapterId],
    queryFn: async () => {
      // If chapter ID provided, get chapter's demo limit
      if (chapterId) {
        const { data, error } = await supabase
          .from('content_nodes')
          .select('demo_questions_limit')
          .eq('id', chapterId)
          .maybeSingle();
        
        if (!error && data) {
          return data.demo_questions_limit;
        }
      }
      
      // Fallback to exam-level demo_questions_limit
      if (examId) {
        const { data, error } = await supabase
          .from('exams')
          .select('demo_questions_limit')
          .eq('id', examId)
          .maybeSingle();
        
        if (!error && data) {
          return data.demo_questions_limit ?? 10;
        }
      }
      
      return 10; // Default
    },
    enabled: !!examId,
  });

  // Check subscription status
  const { data: hasSubscription, isLoading: subLoading } = useQuery({
    queryKey: ['subscription-check', examId, user?.id],
    queryFn: async () => {
      if (!examId || !user?.id) return false;
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('exam_id', examId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();
      
      return !!data && !error;
    },
    enabled: !!examId && !!user?.id,
  });

  // Check demo usage - now tracking at chapter level when applicable
  const demoTrackingKey = chapterId || examId;
  const { data: demoUsage, isLoading: demoLoading } = useQuery({
    queryKey: ['demo-usage', demoTrackingKey, user?.id],
    queryFn: async () => {
      if (!examId || !user?.id) return null;
      
      // Check if demo completed for this exam (or specific chapter)
      let query = supabase
        .from('demo_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('exam_id', examId);
      
      const { data, error } = await query.maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!examId && !!user?.id,
  });

  // Mark demo as complete
  const markDemoCompleteMutation = useMutation({
    mutationFn: async () => {
      if (!examId || !user?.id) return;
      
      if (demoUsage) {
        // Update existing record
        await supabase
          .from('demo_usage')
          .update({ demo_completed: true })
          .eq('exam_id', examId)
          .eq('user_id', user.id);
      } else {
        // Insert new record
        await supabase
          .from('demo_usage')
          .insert({
            exam_id: examId,
            user_id: user.id,
            demo_completed: true,
            questions_attempted: demoLimit || 10,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo-usage', demoTrackingKey, user?.id] });
    },
  });

  const demoCompleted = demoUsage?.demo_completed ?? false;
  const demoQuestionsLimit = demoLimit ?? 10;
  
  // User can access if: has subscription OR demo not completed yet
  const canAccess = hasSubscription || !demoCompleted;

  return {
    hasSubscription: hasSubscription ?? false,
    demoCompleted,
    demoQuestionsLimit,
    canAccess,
    isLoading: subLoading || demoLoading,
    markDemoComplete: () => markDemoCompleteMutation.mutate(),
  };
};
