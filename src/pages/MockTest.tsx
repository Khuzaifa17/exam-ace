import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
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
  const questionCount = parseInt(searchParams.get('count') || '20');
  const timeLimit = parseInt(searchParams.get('time') || '30'); // in minutes

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60); // in seconds
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [results, setResults] = useState<Record<string, AnswerResult>>({});
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch questions
  const { data: questions, isLoading } = useQuery({
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
    enabled: !!examId,
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
  }, [questions, selectedOptions, isSubmitting]);

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

  const handleStartTest = () => {
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

  const currentQuestion = questions?.[currentIndex];
  const answeredCount = Object.keys(selectedOptions).length;
  const correctCount = Object.values(results).filter(r => r.is_correct).length;

  // Results Screen
  if (testCompleted) {
    const totalAnswered = Object.keys(selectedOptions).length;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    return (
      <Layout hideFooter>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-8 max-w-lg w-full text-center">
            <div className="mb-6">
              {accuracy >= 70 ? (
                <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
              ) : accuracy >= 50 ? (
                <AlertTriangle className="h-16 w-16 text-warning mx-auto" />
              ) : (
                <XCircle className="h-16 w-16 text-destructive mx-auto" />
              )}
            </div>

            <h1 className="font-display text-3xl font-bold mb-2">Test Complete!</h1>
            <p className="text-muted-foreground mb-8">Here's how you performed</p>

            <div className="grid grid-cols-3 gap-4 mb-8">
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

            <div className="text-sm text-muted-foreground mb-8">
              {questions?.length && questions.length - totalAnswered > 0 && (
                <span>{questions.length - totalAnswered} questions were not answered</span>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate('/exams')}>
                Back to Exams
              </Button>
              <Button variant="hero" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Start Screen
  if (!testStarted) {
    return (
      <Layout hideFooter>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-8 max-w-lg w-full text-center">
            <Clock className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="font-display text-3xl font-bold mb-2">Mock Test</h1>
            <p className="text-muted-foreground mb-8">
              Test your knowledge with a timed exam
            </p>

            <div className="bg-muted/50 rounded-xl p-6 mb-8">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <div className="text-sm text-muted-foreground">Questions</div>
                  <div className="text-xl font-semibold">{questions?.length || questionCount}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Time Limit</div>
                  <div className="text-xl font-semibold">{timeLimit} mins</div>
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground mb-8">
              <p>• You can navigate between questions freely</p>
              <p>• Test will auto-submit when time runs out</p>
              <p>• Use keyboard shortcuts: 1-4 to select, ← → to navigate</p>
            </div>

            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button 
                variant="hero" 
                onClick={handleStartTest}
                disabled={isLoading || !questions?.length}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Start Test'
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
