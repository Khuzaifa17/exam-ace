import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertTriangle, CreditCard, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';

interface DemoResultsScreenProps {
  examId: string;
  examTitle?: string;
  correctCount: number;
  totalAnswered: number;
  totalQuestions: number;
}

export const DemoResultsScreen = ({ 
  examId, 
  examTitle, 
  correctCount, 
  totalAnswered,
  totalQuestions 
}: DemoResultsScreenProps) => {
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
  const unanswered = totalQuestions - totalAnswered;

  return (
    <Layout hideFooter>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 max-w-lg w-full text-center">
          {/* Result Icon */}
          <div className="mb-6">
            {accuracy >= 70 ? (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/20 mx-auto">
                <Trophy className="h-10 w-10 text-success" />
              </div>
            ) : accuracy >= 50 ? (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warning/20 mx-auto">
                <AlertTriangle className="h-10 w-10 text-warning" />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/20 mx-auto">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
            )}
          </div>

          <h1 className="font-display text-3xl font-bold mb-2">Demo Complete!</h1>
          <p className="text-muted-foreground mb-6">
            Here's your performance {examTitle ? `on ${examTitle}` : ''}
          </p>

          {/* Results Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-success">{correctCount}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-destructive">{totalAnswered - correctCount}</div>
              <div className="text-sm text-muted-foreground">Incorrect</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="text-2xl font-bold">{accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
          </div>

          {unanswered > 0 && (
            <p className="text-sm text-muted-foreground mb-6">
              {unanswered} question{unanswered > 1 ? 's were' : ' was'} not answered
            </p>
          )}

          {/* Subscription CTA */}
          <div className="bg-gradient-to-r from-secondary/10 to-primary/10 rounded-xl p-6 mb-6 border border-secondary/20">
            <h3 className="font-semibold mb-3 text-lg">🎉 Great start! Continue practicing?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Subscribe now to unlock unlimited questions and mock tests
            </p>
            <ul className="text-sm text-left space-y-2 mb-4">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                Unlimited practice questions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                Unlimited mock tests
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                Detailed explanations
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
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
