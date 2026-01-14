import { BookOpen, FileText, Users, CreditCard, TrendingUp, Clock } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const AdminOverview = () => {
  // Fetch stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [exams, questions, profiles, payments] = await Promise.all([
        supabase.from('exams').select('*', { count: 'exact', head: true }),
        supabase.from('questions').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('*').eq('status', 'pending'),
      ]);

      return {
        examsCount: exams.count || 0,
        questionsCount: questions.count || 0,
        usersCount: profiles.count || 0,
        pendingPayments: payments.data?.length || 0,
      };
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            icon={BookOpen}
            label="Total Exams"
            value={isLoading ? undefined : stats?.examsCount.toString()}
            color="primary"
          />
          <StatsCard
            icon={FileText}
            label="Total Questions"
            value={isLoading ? undefined : stats?.questionsCount.toString()}
            color="secondary"
          />
          <StatsCard
            icon={Users}
            label="Registered Users"
            value={isLoading ? undefined : stats?.usersCount.toString()}
            color="success"
          />
          <StatsCard
            icon={Clock}
            label="Pending Payments"
            value={isLoading ? undefined : stats?.pendingPayments.toString()}
            color="warning"
            highlight={stats?.pendingPayments ? stats.pendingPayments > 0 : false}
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ActionCard
              href="/admin/exams"
              icon={BookOpen}
              title="Manage Exams"
              description="Create and edit exam structures"
            />
            <ActionCard
              href="/admin/questions"
              icon={FileText}
              title="Question Bank"
              description="Add or edit questions"
            />
            <ActionCard
              href="/admin/import"
              icon={TrendingUp}
              title="Import Questions"
              description="Bulk import from CSV"
            />
            <ActionCard
              href="/admin/payments"
              icon={CreditCard}
              title="Approve Payments"
              description={`${stats?.pendingPayments || 0} pending`}
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

interface StatsCardProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  color: 'primary' | 'success' | 'secondary' | 'warning';
  highlight?: boolean;
}

const StatsCard = ({ icon: Icon, label, value, color, highlight }: StatsCardProps) => {
  const colorStyles = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    secondary: 'bg-secondary/20 text-secondary-foreground',
    warning: 'bg-warning/10 text-warning',
  };

  return (
    <Card className={highlight ? 'border-warning' : ''}>
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

interface ActionCardProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

const ActionCard = ({ href, icon: Icon, title, description }: ActionCardProps) => (
  <a
    href={href}
    className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/30 transition-colors group"
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <div className="font-medium group-hover:text-primary transition-colors">{title}</div>
      <div className="text-sm text-muted-foreground">{description}</div>
    </div>
  </a>
);

export default AdminOverview;
