import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, Loader2, AlertTriangle, Trophy, CreditCard, Settings } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useExamAccess } from '@/hooks/useExamAccess';
import { SubscriptionRequired } from '@/components/SubscriptionRequired';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QuestionPublic {
  id: string;
  text1: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  content_node_id: string;
}

interface AnswerResult {
  is_correct: boolean;
  correct_option: number;
  explanation: string | null;
}

const MockTest = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const examId = searchParams.get('exam');

  // Check access rights
  const { hasSubscription, demoCompleted, demoQuestionsLimit, canAccess, isLoading: accessLoading, markDemoComplete } = useExamAccess(examId);

  // User-configurable settings
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(20);
  const [selectedTimeLimit, setSelectedTimeLimit] = useState(30); // in minutes

  // Determine question count based on subscription status
  const questionCount = hasSubscription ? selectedQuestionCount : demoQuestionsLimit;
  const timeLimit = hasSubscription ? selectedTimeLimit : Math.min(selectedTimeLimit, 15); // Demo max 15 mins

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60); // in seconds
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [results, setResults] = useState<Record<string, AnswerResult>>({});
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch total available questions count
  const { data: totalQuestionsAvailable, isLoading: countLoading } = useQuery({
    queryKey: ['questions-count', examId],
    queryFn: async () => {
      if (!examId) return 0;

      const { data: nodes, error: nodesError } = await supabase
        .from('content_nodes')
        .select('id')
        .eq('exam_id', examId);

      if (nodesError) throw nodesError;
      if (!nodes || nodes.length === 0) return 0;

      const nodeIds = nodes.map(n => n.id);

      const { count, error } = await supabase
        .from('questions_public')
        .select('id', { count: 'exact', head: true })
        .in('content_node_id', nodeIds);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!examId,
  });

  // Fetch questions only when test starts
  const { data: questions, isLoading, refetch: fetchQuestions } = useQuery({
    queryKey: ['mock-questions', examId, questionCount],
    queryFn: async () => {
      if (!examId) return [];

      const { data: nodes, error: nodesError } = await supabase
        .from('content_nodes')
        .select('id')
        .eq('exam_id', examId);

      if (nodesError) throw nodesError;
      if (!nodes || nodes.length === 0) return [];

      const nodeIds = nodes.map(n => n.id);

      const { data, error } = await supabase
        .from('questions_public')
        .select('*')
        .in('content_node_id', nodeIds);

      if (error) throw error;
      
      // Shuffle and limit questions
      const shuffled = (data as QuestionPublic[]).sort(() => Math.random() - 0.5);
      return shuffled.slice(0, questionCount);
    },
    enabled: false, // Don't fetch automatically
  });

  // Timer
  useEffect(() => {
    if (!testStarted || testCompleted || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [testStarted, testCompleted, timeRemaining]);

  // Submit test
  const handleSubmitTest = useCallback(async () => {
    if (!questions || isSubmitting) return;
    
    setIsSubmitting(true);
    const allResults: Record<string, AnswerResult> = {};

    // Check all answers
    for (const [index, question] of questions.entries()) {
      const selected = selectedOptions[index];
      if (selected !== undefined) {
        try {
          const { data, error } = await supabase
            .rpc('check_answer', {
              question_id: question.id,
              selected_option: selected
            });
          
          if (!error && data && data[0]) {
            allResults[question.id] = data[0] as AnswerResult;
          }
        } catch (e) {
          console.error('Error checking answer:', e);
        }
      }
    }

    setResults(allResults);
    setTestCompleted(true);
    setIsSubmitting(false);
    
    // Mark demo as complete for non-subscribers
    if (!hasSubscription) {
      markDemoComplete();
    }
  }, [questions, selectedOptions, isSubmitting, hasSubscription, markDemoComplete]);

  const handleSelectOption = (option: number) => {
    if (testCompleted) return;
    setSelectedOptions(prev => ({ ...prev, [currentIndex]: option }));
  };

  const handleNext = () => {
    if (!questions) return;
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleStartTest = async () => {
    setTimeRemaining(timeLimit * 60);
    await fetchQuestions();
    setTestStarted(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!testStarted || testCompleted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '4') {
        handleSelectOption(parseInt(e.key));
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [testStarted, testCompleted, currentIndex]);

  if (!examId) {
    navigate('/exams');
    return null;
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  // Show loading while checking access
  if (accessLoading) {
    return (
      <Layout hideFooter>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Show subscription required if demo completed and no subscription
  if (!canAccess) {
    return <SubscriptionRequired examId={examId} />;
  }

  const currentQuestion = questions?.[currentIndex];
  const answeredCount = Object.keys(selectedOptions).length;
  const correctCount = Object.values(results).filter(r => r.is_correct).length;

  // Results Screen - Split Layout
  if (testCompleted) {
    const totalAnswered = Object.keys(selectedOptions).length;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const unanswered = (questions?.length || 0) - totalAnswered;
    const timeTaken = (timeLimit * 60) - timeRemaining;
    const minsUsed = Math.floor(timeTaken / 60);
    const secsUsed = timeTaken % 60;

    return (
      <Layout hideFooter>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
          <div className="w-full max-w-5xl">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Side - Results */}
              <div className="glass-card rounded-3xl p-8">
                {/* Result Icon */}
                <div className="text-center mb-6">
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

                <h1 className="font-display text-3xl font-bold mb-2 text-center">
                  {hasSubscription ? 'Test Complete!' : 'Demo Complete!'}
                </h1>
                <p className="text-muted-foreground mb-6 text-center">Here's your performance</p>

                {/* Results Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-success">{correctCount}</div>
                    <div className="text-sm text-muted-foreground">Correct</div>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-destructive">{totalAnswered - correctCount}</div>
                    <div className="text-sm text-muted-foreground">Incorrect</div>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold">{accuracy}%</div>
                    <div className="text-sm text-muted-foreground">Accuracy</div>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold">{minsUsed}:{secsUsed.toString().padStart(2, '0')}</div>
                    <div className="text-sm text-muted-foreground">Time Used</div>
                  </div>
                </div>

                {unanswered > 0 && (
                  <p className="text-sm text-muted-foreground mb-6 text-center">
                    {unanswered} question{unanswered > 1 ? 's were' : ' was'} not answered
                  </p>
                )}

                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={() => navigate('/exams')}>
                    Back to Exams
                  </Button>
                  <Button variant="hero" onClick={() => window.location.reload()}>
                    Try Again
                  </Button>
                </div>
              </div>

              {/* Right Side - Subscription CTA */}
              <div className="glass-card rounded-3xl p-8">
                <div className="h-full flex flex-col">
                  <div className="text-center mb-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20 mx-auto mb-4">
                      <CreditCard className="h-8 w-8 text-secondary" />
                    </div>
                    <h2 className="font-display text-2xl font-bold mb-2">
                      {hasSubscription ? 'You\'re a Pro!' : 'Upgrade to Pro'}
                    </h2>
                    <p className="text-muted-foreground">
                      {hasSubscription
                        ? 'Enjoy unlimited access to all features'
                        : 'Unlock full access to maximize your preparation'
                      }
                    </p>
                  </div>

                  <div className="flex-1">
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className={cn("h-5 w-5 shrink-0", hasSubscription ? "text-success" : "text-muted-foreground")} />
                        <span>Unlimited practice questions</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className={cn("h-5 w-5 shrink-0", hasSubscription ? "text-success" : "text-muted-foreground")} />
                        <span>Unlimited mock tests</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className={cn("h-5 w-5 shrink-0", hasSubscription ? "text-success" : "text-muted-foreground")} />
                        <span>Custom question count & time</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className={cn("h-5 w-5 shrink-0", hasSubscription ? "text-success" : "text-muted-foreground")} />
                        <span>Detailed explanations</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className={cn("h-5 w-5 shrink-0", hasSubscription ? "text-success" : "text-muted-foreground")} />
                        <span>Track your progress</span>
                      </li>
                    </ul>
                  </div>

                  {!hasSubscription && (
                    <Button variant="gold" size="lg" className="w-full" asChild>
                      <Link to={`/payments?exam=${examId}`}>
                        <CreditCard className="h-5 w-5" />
                        Subscribe Now
                      </Link>
                    </Button>
                  )}

                  {hasSubscription && (
                    <div className="text-center p-4 bg-success/10 rounded-xl border border-success/20">
                      <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-2" />
                      <p className="font-medium text-success">Active Subscription</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Setup Screen - User configures test
  if (!testStarted) {
    const maxQuestions = hasSubscription 
      ? Math.min(totalQuestionsAvailable || 100, 100) 
      : demoQuestionsLimit;
    
    const questionOptions = hasSubscription
      ? [10, 20, 30, 50, 75, 100].filter(n => n <= maxQuestions)
      : [demoQuestionsLimit];

    const timeOptions = hasSubscription
      ? [10, 15, 20, 30, 45, 60, 90, 120]
      : [10, 15];

    return (
      <Layout hideFooter>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-8 max-w-lg w-full">
            <div className="text-center mb-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                <Settings className="h-8 w-8 text-primary" />
              </div>
              <h1 className="font-display text-3xl font-bold mb-2">Configure Your Test</h1>
              <p className="text-muted-foreground">
                Customize your mock test settings
              </p>
            </div>

            <div className="space-y-6 mb-8">
              {/* Question Count Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">
                  Number of Questions
                  {!hasSubscription && (
                    <span className="text-xs text-muted-foreground ml-2">(Demo limit: {demoQuestionsLimit})</span>
                  )}
                </Label>
                {hasSubscription ? (
                  <div className="space-y-3">
                    <Slider
                      value={[selectedQuestionCount]}
                      onValueChange={(value) => setSelectedQuestionCount(value[0])}
                      min={5}
                      max={maxQuestions}
                      step={5}
                      className="py-2"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>5</span>
                      <span className="font-semibold text-foreground">{selectedQuestionCount} questions</span>
                      <span>{maxQuestions}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-xl text-center">
                    <span className="text-2xl font-bold">{demoQuestionsLimit}</span>
                    <span className="text-muted-foreground ml-2">questions</span>
                  </div>
                )}
              </div>

              {/* Time Limit Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">
                  Time Limit
                  {!hasSubscription && (
                    <span className="text-xs text-muted-foreground ml-2">(Demo max: 15 mins)</span>
                  )}
                </Label>
                <Select
                  value={selectedTimeLimit.toString()}
                  onValueChange={(value) => setSelectedTimeLimit(parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time.toString()}>
                        {time >= 60 ? `${time / 60} hour${time > 60 ? 's' : ''}` : `${time} minutes`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Summary */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-sm text-muted-foreground">Questions</div>
                    <div className="text-xl font-semibold">{questionCount}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Time</div>
                    <div className="text-xl font-semibold">{timeLimit} mins</div>
                  </div>
                </div>
              </div>

              {!hasSubscription && (
                <div className="p-4 bg-secondary/10 rounded-xl border border-secondary/20">
                  <p className="text-sm text-center">
                    <span className="font-medium">Demo Mode:</span> Subscribe to unlock custom settings and unlimited questions
                  </p>
                </div>
              )}
            </div>

            <div className="text-sm text-muted-foreground mb-6 space-y-1">
              <p>• You can navigate between questions freely</p>
              <p>• Test will auto-submit when time runs out</p>
              <p>• Use keyboard: 1-4 to select, ← → to navigate</p>
            </div>

            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button 
                variant="hero" 
                onClick={handleStartTest}
                disabled={countLoading || !totalQuestionsAvailable}
              >
                {countLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    Start Test
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Top Bar */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-16 z-40">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <Button variant="ghost" size="sm" onClick={() => setShowExitDialog(true)}>
                <ChevronLeft className="h-4 w-4" />
                Exit
              </Button>

              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Question {currentIndex + 1} of {questions?.length || 0}
                </div>
                <div className={cn(
                  "flex items-center gap-2 font-mono text-lg font-semibold",
                  timeRemaining <= 60 && "text-destructive animate-pulse"
                )}>
                  <Clock className="h-5 w-5" />
                  {formatTime(timeRemaining)}
                </div>
              </div>

              <Button 
                variant="hero" 
                size="sm" 
                onClick={handleSubmitTest}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  `Submit (${answeredCount}/${questions?.length})`
                )}
              </Button>
            </div>

            {/* Progress */}
            <Progress
              value={((currentIndex + 1) / (questions?.length || 1)) * 100}
              className="h-1 mt-3"
            />
          </div>
        </div>

        {/* Question Grid */}
        <div className="bg-muted/30 border-b border-border py-2 overflow-x-auto">
          <div className="container mx-auto px-4">
            <div className="flex gap-1 min-w-max">
              {questions?.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                    currentIndex === idx && "bg-primary text-primary-foreground",
                    selectedOptions[idx] !== undefined && currentIndex !== idx && "bg-success/20 text-success",
                    selectedOptions[idx] === undefined && currentIndex !== idx && "bg-muted hover:bg-muted/80"
                  )}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 container mx-auto px-4 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !questions || questions.length === 0 ? (
            <div className="text-center py-20">
              <h2 className="font-display text-2xl font-bold mb-4">No Questions Available</h2>
              <p className="text-muted-foreground mb-6">
                There are no questions for this exam yet.
              </p>
              <Button onClick={() => navigate('/exams')}>Browse Exams</Button>
            </div>
          ) : currentQuestion ? (
            <div className="max-w-3xl mx-auto">
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="question-badge question-badge-current">
                    {currentIndex + 1}
                  </div>
                  {currentQuestion.difficulty && (
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-1 rounded-full',
                        currentQuestion.difficulty === 'easy' && 'bg-success/10 text-success',
                        currentQuestion.difficulty === 'medium' && 'bg-warning/10 text-warning',
                        currentQuestion.difficulty === 'hard' && 'bg-destructive/10 text-destructive'
                      )}
                    >
                      {currentQuestion.difficulty}
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div className="glass-card rounded-2xl p-6 mb-6">
                <p className="text-lg font-medium leading-relaxed">{currentQuestion.text1}</p>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-8">
                {[1, 2, 3, 4].map((optionNum) => {
                  const optionText = currentQuestion[`option${optionNum}` as keyof QuestionPublic] as string;
                  const isSelected = selectedOptions[currentIndex] === optionNum;

                  return (
                    <button
                      key={optionNum}
                      onClick={() => handleSelectOption(optionNum)}
                      className={cn(
                        'quiz-option w-full text-left',
                        isSelected && 'quiz-option-selected'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg border-2 text-sm font-semibold shrink-0',
                          isSelected && 'border-primary bg-primary text-primary-foreground',
                          !isSelected && 'border-border'
                        )}
                      >
                        {optionNum}
                      </span>
                      <span className="flex-1">{optionText}</span>
                    </button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={currentIndex === questions.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Mock Test?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be lost. Are you sure you want to exit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Test</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate(-1)}>
              Exit Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default MockTest;
