import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Clock, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const gradients = [
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-amber-500 to-orange-600',
  'from-purple-500 to-pink-600',
  'from-rose-500 to-red-600',
  'from-cyan-500 to-blue-600',
];

export const ExamsPreviewSection = () => {
  const { data: exams, isLoading } = useQuery({
    queryKey: ['exams-preview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('is_active', true)
        .order('title')
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-96 mb-12" />
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card rounded-2xl overflow-hidden">
                <Skeleton className="h-2 w-full" />
                <div className="p-6 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!exams || exams.length === 0) return null;

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Popular <span className="gradient-text">Exams</span>
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Start preparing for Pakistan's most competitive exams with our comprehensive question banks.
            </p>
          </div>
          <Button variant="outline" asChild className="w-fit">
            <Link to="/exams" className="group">
              View All Exams
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {exams.map((exam, index) => (
            <Link
              key={exam.id}
              to={`/exam/${exam.slug}`}
              className="group glass-card overflow-hidden rounded-2xl hover:shadow-card-hover transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`h-2 bg-gradient-to-r ${gradients[index % gradients.length]}`} />
              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {exam.demo_questions_limit} Demo Questions
                  </Badge>
                </div>

                <h3 className="font-display text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {exam.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {exam.description || 'Comprehensive practice for this competitive exam.'}
                </p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    MCQs
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
