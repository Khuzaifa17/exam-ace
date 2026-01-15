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

export const useExamAccess = (examId: string | null): ExamAccessResult => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch exam settings
  const { data: exam } = useQuery({
    queryKey: ['exam-access-settings', examId],
    queryFn: async () => {
      if (!examId) return null;
      const { data, error } = await supabase
        .from('exams')
        .select('id, demo_questions_limit')
        .eq('id', examId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
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

  // Check demo usage
  const { data: demoUsage, isLoading: demoLoading } = useQuery({
    queryKey: ['demo-usage', examId, user?.id],
    queryFn: async () => {
      if (!examId || !user?.id) return null;
      
      const { data, error } = await supabase
        .from('demo_usage')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', user.id)
        .maybeSingle();
      
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
            questions_attempted: exam?.demo_questions_limit || 10,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo-usage', examId, user?.id] });
    },
  });

  const demoCompleted = demoUsage?.demo_completed ?? false;
  const demoQuestionsLimit = exam?.demo_questions_limit ?? 10;
  
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
