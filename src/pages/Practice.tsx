import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  text1: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: number;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
}

const Practice = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const examId = searchParams.get('exam');
  const nodeId = searchParams.get('node');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answers, setAnswers] = useState<Record<string, { selected: number; correct: boolean }>>({});

  // Fetch questions
  const { data: questions, isLoading } = useQuery({
    queryKey: ['practice-questions', examId, nodeId],
    queryFn: async () => {
      if (!examId) return [];

      let query = supabase
        .from('questions')
        .select(`
          *,
          content_nodes!inner (
            exam_id
          )
        `)
        .eq('content_nodes.exam_id', examId)
        .limit(20);

      if (nodeId) {
        // TODO: Include descendant nodes
        query = query.eq('content_node_id', nodeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Shuffle questions
      return (data as Question[]).sort(() => Math.random() - 0.5);
    },
    enabled: !!examId,
  });

  // Fetch bookmarks
  const { data: bookmarks } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('bookmarks')
        .select('question_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data.map((b) => b.question_id);
    },
    enabled: !!user?.id,
  });

  // Toggle bookmark
  const bookmarkMutation = useMutation({
    mutationFn: async (questionId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const isBookmarked = bookmarks?.includes(questionId);
      
      if (isBookmarked) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('question_id', questionId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert({ user_id: user.id, question_id: questionId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id] });
    },
  });

  const currentQuestion = questions?.[currentIndex];
  const isBookmarked = currentQuestion && bookmarks?.includes(currentQuestion.id);

  const handleSelectOption = (option: number) => {
    if (showAnswer) return;
    setSelectedOption(option);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !currentQuestion) return;
    
    const isCorrect = selectedOption === currentQuestion.correct_option;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: { selected: selectedOption, correct: isCorrect },
    }));
    setShowAnswer(true);
  };

  const handleNext = () => {
    if (!questions) return;
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowAnswer(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      const prevQuestion = questions?.[currentIndex - 1];
      if (prevQuestion && answers[prevQuestion.id]) {
        setSelectedOption(answers[prevQuestion.id].selected);
        setShowAnswer(true);
      } else {
        setSelectedOption(null);
        setShowAnswer(false);
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '4' && !showAnswer) {
        handleSelectOption(parseInt(e.key));
      } else if (e.key === 'Enter' && selectedOption !== null && !showAnswer) {
        handleSubmitAnswer();
      } else if (e.key === 'ArrowRight' && showAnswer) {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOption, showAnswer, currentIndex]);

  if (!examId) {
    navigate('/exams');
    return null;
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const correctCount = Object.values(answers).filter((a) => a.correct).length;
  const totalAnswered = Object.keys(answers).length;

  return (
    <Layout hideFooter>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Top Bar */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-16 z-40">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
                Exit
              </Button>

              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Question {currentIndex + 1} of {questions?.length || 0}
                </div>
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>{correctCount} correct</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground hidden md:block">
                Press 1-4 to select • Enter to submit • ← → to navigate
              </div>
            </div>

            {/* Progress */}
            <Progress
              value={((currentIndex + 1) / (questions?.length || 1)) * 100}
              className="h-1 mt-3"
            />
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
                There are no questions for this selection yet.
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => bookmarkMutation.mutate(currentQuestion.id)}
                  disabled={bookmarkMutation.isPending}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="h-5 w-5 text-primary" />
                  ) : (
                    <Bookmark className="h-5 w-5" />
                  )}
                </Button>
              </div>

              {/* Question Text */}
              <div className="glass-card rounded-2xl p-6 mb-6">
                <p className="text-lg font-medium leading-relaxed">{currentQuestion.text1}</p>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-8">
                {[1, 2, 3, 4].map((optionNum) => {
                  const optionText = currentQuestion[`option${optionNum}` as keyof Question] as string;
                  const isSelected = selectedOption === optionNum;
                  const isCorrect = currentQuestion.correct_option === optionNum;
                  const showResult = showAnswer;

                  return (
                    <button
                      key={optionNum}
                      onClick={() => handleSelectOption(optionNum)}
                      disabled={showAnswer}
                      className={cn(
                        'quiz-option w-full text-left',
                        isSelected && !showResult && 'quiz-option-selected',
                        showResult && isCorrect && 'quiz-option-correct',
                        showResult && isSelected && !isCorrect && 'quiz-option-incorrect',
                        showResult && 'quiz-option-disabled'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg border-2 text-sm font-semibold shrink-0',
                          isSelected && !showResult && 'border-primary bg-primary text-primary-foreground',
                          showResult && isCorrect && 'border-success bg-success text-success-foreground',
                          showResult && isSelected && !isCorrect && 'border-destructive bg-destructive text-destructive-foreground',
                          !isSelected && !showResult && 'border-border'
                        )}
                      >
                        {optionNum}
                      </span>
                      <span className="flex-1">{optionText}</span>
                      {showResult && isCorrect && <CheckCircle2 className="h-5 w-5 text-success shrink-0" />}
                      {showResult && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-destructive shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {showAnswer && currentQuestion.explanation && (
                <div className="glass-card rounded-2xl p-6 mb-8 border-l-4 border-primary animate-fade-in">
                  <h4 className="font-semibold mb-2">Explanation</h4>
                  <p className="text-muted-foreground">{currentQuestion.explanation}</p>
                </div>
              )}

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

                {!showAnswer ? (
                  <Button
                    variant="hero"
                    onClick={handleSubmitAnswer}
                    disabled={selectedOption === null}
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <Button
                    variant="hero"
                    onClick={handleNext}
                    disabled={currentIndex === questions.length - 1}
                  >
                    Next Question
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Bottom Stats Bar */}
        {totalAnswered > 0 && (
          <div className="border-t border-border bg-card/50 backdrop-blur-sm py-4">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>{correctCount} Correct</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span>{totalAnswered - correctCount} Incorrect</span>
                </div>
                <div className="text-muted-foreground">
                  Accuracy: {Math.round((correctCount / totalAnswered) * 100)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Practice;
