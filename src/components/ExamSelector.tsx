import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExamSelectorProps {
  mode: 'practice' | 'mock';
}

export const ExamSelector = ({ mode }: ExamSelectorProps) => {
  const navigate = useNavigate();

  const { data: exams, isLoading } = useQuery({
    queryKey: ['active-exams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('is_active', true)
        .order('title');
      if (error) throw error;
      return data;
    },
  });

  const handleSelect = (examId: string) => {
    navigate(`/${mode === 'practice' ? 'practice' : 'mock'}?exam=${examId}`);
  };

  const title = mode === 'practice' ? 'Practice Mode' : 'Mock Test';
  const subtitle = mode === 'practice'
    ? 'Select an exam to start practicing questions at your own pace'
    : 'Select an exam to take a timed mock test';
  const Icon = mode === 'practice' ? BookOpen : Clock;

  return (
    <Layout hideFooter>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-2">{title}</h1>
            <p className="text-muted-foreground text-lg">{subtitle}</p>
          </div>

          {/* Exam Cards */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : !exams || exams.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No exams available yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {exams.map((exam) => (
                <Card
                  key={exam.id}
                  className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5"
                  onClick={() => handleSelect(exam.id)}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{exam.title}</h3>
                      {exam.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {exam.description}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
