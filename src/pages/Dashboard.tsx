import { Link, Navigate } from 'react-router-dom';
import { BookOpen, Clock, Trophy, Target, TrendingUp, BookmarkIcon, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const Dashboard = () => {
  const { user, isAdmin, loading } = useAuth();

  // Admin users should only see admin panel
  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch tests
      const { data: tests } = await supabase
        .from('tests')
        .select('*')
        .eq('user_id', user.id);

      // Fetch bookmarks count
      const { count: bookmarksCount } = await supabase
        .from('bookmarks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const totalTests = tests?.length || 0;
      const completedTests = tests?.filter((t) => t.completed_at).length || 0;
      const totalQuestions = tests?.reduce((acc, t) => acc + (t.total_questions || 0), 0) || 0;
      const correctAnswers = tests?.reduce((acc, t) => acc + (t.correct_answers || 0), 0) || 0;
      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      return {
        totalTests,
        completedTests,
        totalQuestions,
        correctAnswers,
        accuracy,
        bookmarksCount: bookmarksCount || 0,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch recent tests
  const { data: recentTests } = useQuery({
    queryKey: ['recent-tests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('tests')
        .select(`
          *,
          exams (title, slug)
        `)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-muted-foreground">
            Continue your exam preparation journey
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            icon={BookOpen}
            label="Questions Attempted"
            value={statsLoading ? undefined : (stats?.totalQuestions || 0).toString()}
            color="primary"
          />
          <StatsCard
            icon={Target}
            label="Accuracy"
            value={statsLoading ? undefined : `${stats?.accuracy || 0}%`}
            color="success"
          />
          <StatsCard
            icon={Trophy}
            label="Tests Completed"
            value={statsLoading ? undefined : (stats?.completedTests || 0).toString()}
            color="secondary"
          />
          <StatsCard
            icon={BookmarkIcon}
            label="Bookmarked"
            value={statsLoading ? undefined : (stats?.bookmarksCount || 0).toString()}
            color="accent"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Start</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <Link
                  to="/exams"
                  className="group p-4 rounded-xl border-2 border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="font-semibold group-hover:text-primary transition-colors">
                      Practice Mode
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pick topics and practice with instant feedback
                  </p>
                </Link>

                <Link
                  to="/mock"
                  className="group p-4 rounded-xl border-2 border-border hover:border-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20 text-secondary-foreground">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="font-semibold group-hover:text-secondary transition-colors">
                      Mock Test
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Timed tests simulating real exam conditions
                  </p>
                </Link>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Tests</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/history">
                    View All
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recentTests && recentTests.length > 0 ? (
                  <div className="space-y-3">
                    {recentTests.map((test) => (
                      <div
                        key={test.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`question-badge ${test.completed_at ? 'question-badge-answered' : 'question-badge-unanswered'}`}>
                            {test.is_mock ? 'M' : 'P'}
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {test.exams?.title || 'Unknown Exam'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(test.started_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">
                            {test.correct_answers}/{test.total_questions}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round((test.correct_answers / test.total_questions) * 100)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No tests yet. Start practicing!</p>
                    <Button variant="link" asChild className="mt-2">
                      <Link to="/exams">Browse Exams</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Card */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Questions Mastered</span>
                    <span className="font-medium">{stats?.correctAnswers || 0}</span>
                  </div>
                  <Progress value={Math.min((stats?.correctAnswers || 0) / 100 * 100, 100)} />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Tests Completed</span>
                    <span className="font-medium">{stats?.completedTests || 0}</span>
                  </div>
                  <Progress value={Math.min((stats?.completedTests || 0) / 10 * 100, 100)} />
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardHeader>
                <CardTitle className="text-lg">💡 Tip of the Day</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Review your wrong answers regularly. Studies show spaced repetition helps retain information 50% better!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

interface StatsCardProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  color: 'primary' | 'success' | 'secondary' | 'accent';
}

const StatsCard = ({ icon: Icon, label, value, color }: StatsCardProps) => {
  const colorStyles = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    secondary: 'bg-secondary/20 text-secondary-foreground',
    accent: 'bg-accent text-accent-foreground',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorStyles[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            {value === undefined ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="font-display text-2xl font-bold">{value}</div>
            )}
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
