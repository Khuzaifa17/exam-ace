import { Link } from 'react-router-dom';
import { Lock, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';

interface SubscriptionRequiredProps {
  examId: string;
  examTitle?: string;
}

export const SubscriptionRequired = ({ examId, examTitle }: SubscriptionRequiredProps) => {
  return (
    <Layout hideFooter>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 max-w-lg w-full text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary/20 mx-auto mb-6">
            <Lock className="h-10 w-10 text-secondary" />
          </div>
          
          <h1 className="font-display text-3xl font-bold mb-2">Demo Completed!</h1>
          <p className="text-muted-foreground mb-8">
            You've completed your free demo. To continue practicing {examTitle ? `for ${examTitle}` : ''}, 
            please subscribe to unlock unlimited access.
          </p>

          <div className="bg-muted/50 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold mb-3">What you get with subscription:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Unlimited practice questions
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Unlimited mock tests
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Detailed explanations for all answers
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Track your progress
              </li>
            </ul>
          </div>

          <div className="flex gap-4 justify-center">
            <Button variant="outline" asChild>
              <Link to="/exams">Browse Exams</Link>
            </Button>
            <Button variant="gold" asChild>
              <Link to={`/payments?exam=${examId}`}>
                <CreditCard className="h-4 w-4" />
                Subscribe Now
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};
