import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useExamAccess } from '@/hooks/useExamAccess';
import { SubscriptionRequired } from '@/components/SubscriptionRequired';
import { DemoResultsScreen } from '@/components/DemoResultsScreen';
import { ExamSelector } from '@/components/ExamSelector';

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

const Practice = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const examId = searchParams.get('exam');
  const nodeId = searchParams.get('node');

  // Check access rights
  const { hasSubscription, demoQuestionsLimit, canAccess, isLoading: accessLoading, markDemoComplete } = useExamAccess(examId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<AnswerResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, { selected: number; correct: boolean; correctOption: number }>>({});
  const [showDemoResults, setShowDemoResults] = useState(false);
  const [sessionTestId, setSessionTestId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const questionLimit = hasSubscription ? 50 : demoQuestionsLimit;

  // Fetch questions
  const { data: questions, isLoading } = useQuery({
    queryKey: ['practice-questions', examId, nodeId, questionLimit],
    queryFn: async () => {
      if (!examId) return [];

      const { data: nodes, error: nodesError } = await supabase
        .from('content_nodes')
        .select('id')
        .eq('exam_id', examId);

      if (nodesError) throw nodesError;
      if (!nodes || nodes.length === 0) return [];

      const nodeIds = nodes.map(n => n.id);

      let query = supabase
        .from('questions_public')
        .select('*')
        .in('content_node_id', nodeIds)
        .limit(questionLimit);

      if (nodeId) {
        query = query.eq('content_node_id', nodeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data as QuestionPublic[]).sort(() => Math.random() - 0.5);
    },
    enabled: !!examId && !!user && canAccess,
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

  // Save answer to DB
  const saveAnswerToDB = useCallback(async (questionId: string, selected: number, isCorrect: boolean) => {
    if (!sessionTestId) return;
    await supabase
      .from('test_questions')
      .update({
        selected_option: selected,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
      })
      .eq('test_id', sessionTestId)
      .eq('question_id', questionId);
  }, [sessionTestId]);

  // Check answer
  const checkAnswerMutation = useMutation({
    mutationFn: async ({ questionId, selected }: { questionId: string; selected: number }) => {
      const { data, error } = await supabase
        .rpc('check_answer', { question_id: questionId, selected_option: selected });
      if (error) throw error;
      return data[0] as AnswerResult;
    },
    onSuccess: (result, variables) => {
      setCurrentAnswer(result);
      setAnswers((prev) => ({
        ...prev,
        [variables.questionId]: {
          selected: variables.selected,
          correct: result.is_correct,
          correctOption: result.correct_option,
        },
      }));
      setShowAnswer(true);
      saveAnswerToDB(variables.questionId, variables.selected, result.is_correct);
    },
  });

  // Restore or create session
  useEffect(() => {
    if (!user?.id || !examId || !questions || questions.length === 0 || sessionReady) return;

    const restoreOrCreateSession = async () => {
      const { data: existingSessions } = await supabase
        .from('tests')
        .select('id')
        .eq('user_id', user.id)
        .eq('exam_id', examId)
        .eq('is_mock', false)
        .is('completed_at', null)
        .order('started_at', { ascending: false })
        .limit(1);

      if (existingSessions && existingSessions.length > 0) {
        const testId = existingSessions[0].id;
        setSessionTestId(testId);

        const { data: savedQuestions } = await supabase
          .from('test_questions')
          .select('question_id, selected_option, is_correct, order_index')
          .eq('test_id', testId)
          .not('selected_option', 'is', null)
          .order('order_index');

        if (savedQuestions && savedQuestions.length > 0) {
          const restoredAnswers: Record<string, { selected: number; correct: boolean; correctOption: number }> = {};
          let lastAnsweredIndex = 0;

          for (const sq of savedQuestions) {
            if (sq.selected_option !== null && sq.is_correct !== null) {
              const { data: checkData } = await supabase.rpc('check_answer', {
                question_id: sq.question_id,
                selected_option: sq.selected_option,
              });
              const correctOption = checkData?.[0]?.correct_option ?? sq.selected_option;
              restoredAnswers[sq.question_id] = {
                selected: sq.selected_option,
                correct: sq.is_correct,
                correctOption,
              };
              const qIdx = questions.findIndex(q => q.id === sq.question_id);
              if (qIdx > lastAnsweredIndex) lastAnsweredIndex = qIdx;
            }
          }

          setAnswers(restoredAnswers);
          const nextIndex = Math.min(lastAnsweredIndex + 1, questions.length - 1);
          setCurrentIndex(nextIndex);

          const nextQ = questions[nextIndex];
          if (nextQ && restoredAnswers[nextQ.id]) {
            setSelectedOption(restoredAnswers[nextQ.id].selected);
            setCurrentAnswer({
              is_correct: restoredAnswers[nextQ.id].correct,
              correct_option: restoredAnswers[nextQ.id].correctOption,
              explanation: null,
            });
            setShowAnswer(true);
          }
        }
      } else {
        const { data: newTest } = await supabase
          .from('tests')
          .insert({
            user_id: user.id,
            exam_id: examId,
            is_mock: false,
            total_questions: questions.length,
            content_node_id: nodeId || null,
          })
          .select('id')
          .single();

        if (newTest) {
          setSessionTestId(newTest.id);
          const testQuestionRows = questions.map((q, idx) => ({
            test_id: newTest.id,
            question_id: q.id,
            order_index: idx,
          }));
          await supabase.from('test_questions').insert(testQuestionRows);
        }
      }
      setSessionReady(true);
    };

    restoreOrCreateSession();
  }, [user?.id, examId, questions, sessionReady]);

  const completeSession = useCallback(async () => {
    if (!sessionTestId) return;
    const correctCount = Object.values(answers).filter((a) => a.correct).length;
    await supabase
      .from('tests')
      .update({ completed_at: new Date().toISOString(), correct_answers: correctCount })
      .eq('id', sessionTestId);
  }, [sessionTestId, answers]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '4' && !showAnswer) {
        setSelectedOption(parseInt(e.key));
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

  // --- Early returns AFTER all hooks ---

  if (!examId) {
    return <ExamSelector mode="practice" />;
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  if (accessLoading) {
    return (
      <Layout hideFooter>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!canAccess) {
    return <SubscriptionRequired examId={examId} />;
  }

  const currentQuestion = questions?.[currentIndex];
  const isBookmarked = currentQuestion && bookmarks?.includes(currentQuestion.id);
  const correctCount = Object.values(answers).filter((a) => a.correct).length;
  const totalAnswered = Object.keys(answers).length;

  const handleSelectOption = (option: number) => {
    if (showAnswer) return;
    setSelectedOption(option);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !currentQuestion) return;
    checkAnswerMutation.mutate({ questionId: currentQuestion.id, selected: selectedOption });
  };

  const handleNext = () => {
    if (!questions) return;
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowAnswer(false);
      setCurrentAnswer(null);
    } else if (!hasSubscription && currentIndex === questions.length - 1) {
      markDemoComplete();
      completeSession();
      setShowDemoResults(true);
    } else if (currentIndex === questions.length - 1) {
      completeSession();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      const prevQuestion = questions?.[currentIndex - 1];
      if (prevQuestion && answers[prevQuestion.id]) {
        setSelectedOption(answers[prevQuestion.id].selected);
        setCurrentAnswer({
          is_correct: answers[prevQuestion.id].correct,
          correct_option: answers[prevQuestion.id].correctOption,
          explanation: null,
        });
        setShowAnswer(true);
      } else {
        setSelectedOption(null);
        setShowAnswer(false);
        setCurrentAnswer(null);
      }
    }
  };

  if (showDemoResults) {
    return (
      <DemoResultsScreen
        examId={examId}
        correctCount={correctCount}
        totalAnswered={totalAnswered}
        totalQuestions={questions?.length || 0}
      />
    );
  }

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

            <Progress
              value={((currentIndex + 1) / (questions?.length || 1)) * 100}
              className="h-1 mt-3"
            />
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 container mx-auto px-4 py-8">
          {isLoading || !sessionReady ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !questions || questions.length === 0 ? (
            <div className="text-center py-20">
              <h2 className="font-display text-2xl font-bold mb-4">No Questions Available</h2>
              <p className="text-muted-foreground mb-6">There are no questions for this selection yet.</p>
              <Button onClick={() => navigate('/exams')}>Browse Exams</Button>
            </div>
          ) : currentQuestion ? (
            <div className="max-w-3xl mx-auto">
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="question-badge question-badge-current">{currentIndex + 1}</div>
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
                  const optionText = currentQuestion[`option${optionNum}` as keyof QuestionPublic] as string;
                  const isSelected = selectedOption === optionNum;
                  const isCorrectOption = currentAnswer?.correct_option === optionNum;
                  const showResult = showAnswer;

                  return (
                    <button
                      key={optionNum}
                      onClick={() => handleSelectOption(optionNum)}
                      disabled={showAnswer || checkAnswerMutation.isPending}
                      className={cn(
                        'quiz-option w-full text-left',
                        isSelected && !showResult && 'quiz-option-selected',
                        showResult && isCorrectOption && 'quiz-option-correct',
                        showResult && isSelected && !isCorrectOption && 'quiz-option-incorrect',
                        showResult && 'quiz-option-disabled'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg border-2 text-sm font-semibold shrink-0',
                          isSelected && !showResult && 'border-primary bg-primary text-primary-foreground',
                          showResult && isCorrectOption && 'border-success bg-success text-success-foreground',
                          showResult && isSelected && !isCorrectOption && 'border-destructive bg-destructive text-destructive-foreground',
                          !isSelected && !showResult && 'border-border'
                        )}
                      >
                        {optionNum}
                      </span>
                      <span className="flex-1">{optionText}</span>
                      {showResult && isCorrectOption && <CheckCircle2 className="h-5 w-5 text-success shrink-0" />}
                      {showResult && isSelected && !isCorrectOption && <XCircle className="h-5 w-5 text-destructive shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {showAnswer && currentAnswer?.explanation && (
                <div className="glass-card rounded-2xl p-6 mb-8 border-l-4 border-primary animate-fade-in">
                  <h4 className="font-semibold mb-2">Explanation</h4>
                  <p className="text-muted-foreground">{currentAnswer.explanation}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between gap-4">
                <Button variant="outline" onClick={handlePrevious} disabled={currentIndex === 0}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                {!showAnswer ? (
                  <Button
                    variant="hero"
                    onClick={handleSubmitAnswer}
                    disabled={selectedOption === null || checkAnswerMutation.isPending}
                  >
                    {checkAnswerMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      'Submit Answer'
                    )}
                  </Button>
                ) : (
                  <Button variant="hero" onClick={handleNext}>
                    {currentIndex === questions.length - 1 ? (
                      hasSubscription ? 'Finish' : 'View Results'
                    ) : (
                      <>
                        Next Question
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
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
