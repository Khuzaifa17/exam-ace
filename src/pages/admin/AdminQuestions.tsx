import { useState } from 'react';
import { Search, Plus, Edit2, Trash2, FileText, Filter, Loader2 } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  content_node_id: string;
  text1: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: number;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  year: number | null;
  source: string | null;
  node_title?: string;
  exam_title?: string;
}

const AdminQuestions = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteQuestion, setDeleteQuestion] = useState<Question | null>(null);

  const [formData, setFormData] = useState({
    content_node_id: '',
    text1: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correct_option: 1,
    explanation: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    year: '',
    source: '',
  });

  // Fetch exams for filter
  const { data: exams } = useQuery({
    queryKey: ['admin-exams-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data;
    },
  });

  // Fetch content nodes for dropdown
  const { data: contentNodes } = useQuery({
    queryKey: ['admin-content-nodes-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_nodes')
        .select('id, title, node_type, exam_id')
        .order('title');
      if (error) throw error;
      return data;
    },
  });

  // Fetch questions
  const { data: questions, isLoading } = useQuery({
    queryKey: ['admin-questions', selectedExam],
    queryFn: async () => {
      // First get all questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (questionsError) throw questionsError;
      if (!questionsData) return [];

      // Get node info
      const nodeIds = [...new Set(questionsData.map(q => q.content_node_id))];
      const { data: nodesData } = await supabase
        .from('content_nodes')
        .select('id, title, exam_id')
        .in('id', nodeIds);

      // Get exam info
      const examIds = [...new Set(nodesData?.map(n => n.exam_id) || [])];
      const { data: examsData } = await supabase
        .from('exams')
        .select('id, title')
        .in('id', examIds);

      const nodeMap = new Map(nodesData?.map(n => [n.id, n]) || []);
      const examMap = new Map(examsData?.map(e => [e.id, e.title]) || []);

      let result = questionsData.map(q => {
        const node = nodeMap.get(q.content_node_id);
        return {
          ...q,
          node_title: node?.title || 'Unknown',
          exam_title: node ? examMap.get(node.exam_id) : 'Unknown',
          exam_id: node?.exam_id,
        };
      });

      if (selectedExam !== 'all') {
        result = result.filter(q => q.exam_id === selectedExam);
      }

      return result as (Question & { exam_id?: string })[];
    },
  });

  // Create question mutation
  const createQuestion = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('questions').insert({
        content_node_id: data.content_node_id,
        text1: data.text1,
        option1: data.option1,
        option2: data.option2,
        option3: data.option3,
        option4: data.option4,
        correct_option: data.correct_option,
        explanation: data.explanation || null,
        difficulty: data.difficulty,
        year: data.year ? parseInt(data.year) : null,
        source: data.source || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Question created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create question');
    },
  });

  // Update question mutation
  const updateQuestion = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('questions')
        .update({
          content_node_id: data.content_node_id,
          text1: data.text1,
          option1: data.option1,
          option2: data.option2,
          option3: data.option3,
          option4: data.option4,
          correct_option: data.correct_option,
          explanation: data.explanation || null,
          difficulty: data.difficulty,
          year: data.year ? parseInt(data.year) : null,
          source: data.source || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Question updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      setEditingQuestion(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update question');
    },
  });

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Question deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      setDeleteQuestion(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete question');
    },
  });

  const resetForm = () => {
    setFormData({
      content_node_id: '',
      text1: '',
      option1: '',
      option2: '',
      option3: '',
      option4: '',
      correct_option: 1,
      explanation: '',
      difficulty: 'medium',
      year: '',
      source: '',
    });
  };

  const openEditDialog = (question: Question) => {
    setFormData({
      content_node_id: question.content_node_id,
      text1: question.text1,
      option1: question.option1,
      option2: question.option2,
      option3: question.option3,
      option4: question.option4,
      correct_option: question.correct_option,
      explanation: question.explanation || '',
      difficulty: question.difficulty || 'medium',
      year: question.year?.toString() || '',
      source: question.source || '',
    });
    setEditingQuestion(question);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQuestion) {
      updateQuestion.mutate({ id: editingQuestion.id, data: formData });
    } else {
      createQuestion.mutate(formData);
    }
  };

  const filteredQuestions = questions?.filter((q) =>
    q.text1.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold mb-2">Questions</h1>
            <p className="text-muted-foreground">Manage your question bank</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by exam" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {exams?.map((exam) => (
                <SelectItem key={exam.id} value={exam.id}>
                  {exam.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Questions List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Questions ({filteredQuestions?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredQuestions && filteredQuestions.length > 0 ? (
              <div className="space-y-3">
                {filteredQuestions.map((question) => (
                  <div
                    key={question.id}
                    className="p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-2 mb-2">{question.text1}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="outline">{question.exam_title}</Badge>
                          <Badge variant="secondary">{question.node_title}</Badge>
                          {question.difficulty && (
                            <Badge
                              className={cn(
                                question.difficulty === 'easy' && 'bg-success/10 text-success border-success/20',
                                question.difficulty === 'medium' && 'bg-warning/10 text-warning border-warning/20',
                                question.difficulty === 'hard' && 'bg-destructive/10 text-destructive border-destructive/20'
                              )}
                            >
                              {question.difficulty}
                            </Badge>
                          )}
                          <span className="text-muted-foreground">
                            Correct: Option {question.correct_option}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(question)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteQuestion(question)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No questions found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isCreateOpen || !!editingQuestion} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingQuestion(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add Question'}</DialogTitle>
              <DialogDescription>
                {editingQuestion ? 'Update question details' : 'Create a new question'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Content Node Selection */}
              <div className="space-y-2">
                <Label>Content Node *</Label>
                <Select
                  value={formData.content_node_id}
                  onValueChange={(value) => setFormData({ ...formData, content_node_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a topic/chapter..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contentNodes?.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        [{node.node_type}] {node.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <Label htmlFor="text1">Question (text1) *</Label>
                <Textarea
                  id="text1"
                  value={formData.text1}
                  onChange={(e) => setFormData({ ...formData, text1: e.target.value })}
                  placeholder="Enter the question..."
                  rows={3}
                  required
                />
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className="space-y-2">
                    <Label htmlFor={`option${num}`}>
                      Option {num} {formData.correct_option === num && '(Correct)'} *
                    </Label>
                    <Input
                      id={`option${num}`}
                      value={formData[`option${num}` as keyof typeof formData] as string}
                      onChange={(e) => setFormData({ ...formData, [`option${num}`]: e.target.value })}
                      placeholder={`Option ${num}...`}
                      required
                    />
                  </div>
                ))}
              </div>

              {/* Correct Option */}
              <div className="space-y-2">
                <Label>Correct Option *</Label>
                <Select
                  value={formData.correct_option.toString()}
                  onValueChange={(value) => setFormData({ ...formData, correct_option: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        Option {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Explanation */}
              <div className="space-y-2">
                <Label htmlFor="explanation">Explanation (optional)</Label>
                <Textarea
                  id="explanation"
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  placeholder="Explain the correct answer..."
                  rows={2}
                />
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value: 'easy' | 'medium' | 'hard') => setFormData({ ...formData, difficulty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="Past paper, etc."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateOpen(false);
                  setEditingQuestion(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createQuestion.isPending || updateQuestion.isPending}>
                  {(createQuestion.isPending || updateQuestion.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingQuestion ? 'Save Changes' : 'Create Question'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteQuestion} onOpenChange={() => setDeleteQuestion(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Question</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this question? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteQuestion(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteQuestion && deleteQuestionMutation.mutate(deleteQuestion.id)}
                disabled={deleteQuestionMutation.isPending}
              >
                {deleteQuestionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminQuestions;
