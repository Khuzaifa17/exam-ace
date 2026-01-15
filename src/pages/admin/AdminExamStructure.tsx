import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ChevronLeft, Plus, Edit2, Trash2, FolderOpen, BookOpen, FileText, 
  ChevronDown, ChevronRight, GripVertical, Loader2, MoreVertical, HelpCircle
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type NodeType = 'TRACK' | 'SUBJECT' | 'CHAPTER' | 'TOPIC';

interface ContentNode {
  id: string;
  exam_id: string;
  parent_id: string | null;
  node_type: NodeType;
  title: string;
  description: string | null;
  order_index: number;
  demo_questions_limit: number;
  children?: ContentNode[];
  question_count?: number;
}

const nodeTypeConfig: Record<NodeType, { label: string; icon: typeof FolderOpen; color: string }> = {
  TRACK: { label: 'Track', icon: FolderOpen, color: 'bg-primary/10 text-primary border-primary/20' },
  SUBJECT: { label: 'Subject', icon: BookOpen, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  CHAPTER: { label: 'Chapter', icon: FileText, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  TOPIC: { label: 'Topic', icon: FileText, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
};

const AdminExamStructure = () => {
  const { examId } = useParams<{ examId: string }>();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<ContentNode | null>(null);
  const [deleteNode, setDeleteNode] = useState<ContentNode | null>(null);
  const [parentNodeId, setParentNodeId] = useState<string | null>(null);
  const [manageQuestionsNode, setManageQuestionsNode] = useState<ContentNode | null>(null);
  const [isQuestionFormOpen, setIsQuestionFormOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    node_type: 'TRACK' as NodeType,
    demo_questions_limit: 10,
  });

  const [questionFormData, setQuestionFormData] = useState({
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

  // Fetch exam details
  const { data: exam } = useQuery({
    queryKey: ['admin-exam', examId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!examId,
  });

  // Fetch content nodes with question counts
  const { data: nodes, isLoading } = useQuery({
    queryKey: ['admin-content-nodes', examId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_nodes')
        .select('*')
        .eq('exam_id', examId)
        .order('order_index');
      
      if (error) throw error;

      // Get question counts for each node
      const { data: questionCounts } = await supabase
        .from('questions')
        .select('content_node_id')
        .in('content_node_id', data.map(n => n.id));

      const countMap = new Map<string, number>();
      questionCounts?.forEach(q => {
        countMap.set(q.content_node_id, (countMap.get(q.content_node_id) || 0) + 1);
      });

      return data.map(node => ({
        ...node,
        question_count: countMap.get(node.id) || 0,
      })) as ContentNode[];
    },
    enabled: !!examId,
  });

  // Create node mutation
  const createNode = useMutation({
    mutationFn: async (data: { title: string; description: string; node_type: NodeType; parent_id: string | null; demo_questions_limit: number }) => {
      // Get max order_index for siblings
      const { data: siblings } = await supabase
        .from('content_nodes')
        .select('order_index')
        .eq('exam_id', examId!)
        .eq('parent_id', data.parent_id ?? null)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = siblings && siblings.length > 0 ? siblings[0].order_index + 1 : 0;

      const { error } = await supabase.from('content_nodes').insert({
        exam_id: examId,
        parent_id: data.parent_id,
        node_type: data.node_type,
        title: data.title,
        description: data.description || null,
        order_index: nextOrderIndex,
        demo_questions_limit: data.demo_questions_limit || 10,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Node created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-content-nodes', examId] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create node');
    },
  });

  // Update node mutation
  const updateNode = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title: string; description: string; node_type: NodeType; demo_questions_limit: number } }) => {
      const { error } = await supabase
        .from('content_nodes')
        .update({
          title: data.title,
          description: data.description || null,
          node_type: data.node_type,
          demo_questions_limit: data.demo_questions_limit,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Node updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-content-nodes', examId] });
      setEditingNode(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update node');
    },
  });

  // Delete node mutation
  const deleteNodeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('content_nodes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Node deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-content-nodes', examId] });
      setDeleteNode(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete node');
    },
  });

  // Fetch questions for selected node
  const { data: nodeQuestions, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['node-questions', manageQuestionsNode?.id],
    queryFn: async () => {
      if (!manageQuestionsNode) return [];
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('content_node_id', manageQuestionsNode.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!manageQuestionsNode,
  });

  // Create question mutation
  const createQuestion = useMutation({
    mutationFn: async (data: typeof questionFormData & { content_node_id: string }) => {
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
      toast.success('Question added successfully');
      queryClient.invalidateQueries({ queryKey: ['node-questions', manageQuestionsNode?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-content-nodes', examId] });
      resetQuestionForm();
      setIsQuestionFormOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add question');
    },
  });

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Question deleted');
      queryClient.invalidateQueries({ queryKey: ['node-questions', manageQuestionsNode?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-content-nodes', examId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete question');
    },
  });

  const resetForm = () => {
    setFormData({ title: '', description: '', node_type: 'TRACK', demo_questions_limit: 10 });
    setParentNodeId(null);
  };

  const resetQuestionForm = () => {
    setQuestionFormData({
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

  const openCreateDialog = (parentId: string | null = null, suggestedType?: NodeType) => {
    setParentNodeId(parentId);
    setFormData({
      title: '',
      description: '',
      node_type: suggestedType || 'TRACK',
      demo_questions_limit: 10,
    });
    setIsCreateOpen(true);
  };

  const openEditDialog = (node: ContentNode) => {
    setFormData({
      title: node.title,
      description: node.description || '',
      node_type: node.node_type,
      demo_questions_limit: node.demo_questions_limit || 10,
    });
    setEditingNode(node);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingNode) {
      updateNode.mutate({ id: editingNode.id, data: formData });
    } else {
      createNode.mutate({ ...formData, parent_id: parentNodeId });
    }
  };

  // Build tree structure
  const buildTree = (nodes: ContentNode[]): ContentNode[] => {
    const nodeMap = new Map<string, ContentNode>();
    const rootNodes: ContentNode[] = [];

    nodes.forEach((node) => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    nodes.forEach((node) => {
      const currentNode = nodeMap.get(node.id)!;
      if (node.parent_id) {
        const parent = nodeMap.get(node.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(currentNode);
        }
      } else {
        rootNodes.push(currentNode);
      }
    });

    return rootNodes;
  };

  const tree = nodes ? buildTree(nodes) : [];

  // Get suggested child type
  const getChildType = (parentType: NodeType): NodeType => {
    switch (parentType) {
      case 'TRACK': return 'SUBJECT';
      case 'SUBJECT': return 'CHAPTER';
      case 'CHAPTER': return 'TOPIC';
      default: return 'TOPIC';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/exams">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">{exam?.title || 'Loading...'}</h1>
            <p className="text-sm text-muted-foreground">Manage content structure</p>
          </div>
          <Button onClick={() => openCreateDialog(null, 'TRACK')}>
            <Plus className="h-4 w-4" />
            Add Root Node
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['TRACK', 'SUBJECT', 'CHAPTER', 'TOPIC'].map((type) => {
            const count = nodes?.filter(n => n.node_type === type).length || 0;
            const config = nodeTypeConfig[type as NodeType];
            return (
              <Card key={type} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', config.color)}>
                    <config.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs text-muted-foreground">{config.label}s</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Tree View */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content Tree</CardTitle>
            <CardDescription>
              Organize your exam content in a hierarchical structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : tree.length > 0 ? (
              <div className="space-y-2">
                {tree.map((node) => (
                  <TreeNodeComponent
                    key={node.id}
                    node={node}
                    level={0}
                    examId={examId!}
                    onEdit={openEditDialog}
                    onDelete={setDeleteNode}
                    onAddChild={(parentId, type) => openCreateDialog(parentId, type)}
                    getChildType={getChildType}
                    onManageQuestions={setManageQuestionsNode}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No content structure yet</p>
                <Button onClick={() => openCreateDialog(null, 'TRACK')}>
                  <Plus className="h-4 w-4" />
                  Add First Node
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isCreateOpen || !!editingNode} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingNode(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingNode ? 'Edit Node' : 'Create Node'}</DialogTitle>
              <DialogDescription>
                {editingNode ? 'Update content node details' : 'Add a new node to the content tree'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="node_type">Type</Label>
                <Select
                  value={formData.node_type}
                  onValueChange={(value: NodeType) => setFormData({ ...formData, node_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(nodeTypeConfig).map(([type, config]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter node title..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description..."
                  rows={2}
                />
              </div>

              {formData.node_type === 'CHAPTER' && (
                <div className="space-y-2">
                  <Label htmlFor="demo_limit">Demo Questions Limit</Label>
                  <Input
                    id="demo_limit"
                    type="number"
                    min={1}
                    max={100}
                    value={formData.demo_questions_limit}
                    onChange={(e) => setFormData({ ...formData, demo_questions_limit: parseInt(e.target.value) || 10 })}
                    placeholder="10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of free demo questions for non-subscribers (default: 10)
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateOpen(false);
                  setEditingNode(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createNode.isPending || updateNode.isPending}>
                  {(createNode.isPending || updateNode.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingNode ? 'Save Changes' : 'Create Node'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteNode} onOpenChange={() => setDeleteNode(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Node</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deleteNode?.title}"? This will also delete all child nodes and associated questions. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteNode(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteNode && deleteNodeMutation.mutate(deleteNode.id)}
                disabled={deleteNodeMutation.isPending}
              >
                {deleteNodeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage Questions Dialog */}
        <Dialog open={!!manageQuestionsNode} onOpenChange={(open) => {
          if (!open) {
            setManageQuestionsNode(null);
            setIsQuestionFormOpen(false);
            resetQuestionForm();
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-emerald-600" />
                Manage Questions - {manageQuestionsNode?.title}
              </DialogTitle>
              <DialogDescription>
                Add and manage questions for this topic
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Add Question Button */}
              {!isQuestionFormOpen && (
                <Button onClick={() => setIsQuestionFormOpen(true)} className="w-full">
                  <Plus className="h-4 w-4" />
                  Add New Question
                </Button>
              )}

              {/* Question Form */}
              {isQuestionFormOpen && (
                <Card className="border-emerald-500/30">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">New Question</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Question Text *</Label>
                      <Textarea
                        value={questionFormData.text1}
                        onChange={(e) => setQuestionFormData({ ...questionFormData, text1: e.target.value })}
                        placeholder="Enter question..."
                        rows={2}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((num) => (
                        <div key={num} className="space-y-1">
                          <Label className="text-xs">
                            Option {num} {questionFormData.correct_option === num && '✓'}
                          </Label>
                          <Input
                            value={questionFormData[`option${num}` as keyof typeof questionFormData] as string}
                            onChange={(e) => setQuestionFormData({ ...questionFormData, [`option${num}`]: e.target.value })}
                            placeholder={`Option ${num}`}
                            required
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Correct Option</Label>
                        <Select
                          value={questionFormData.correct_option.toString()}
                          onValueChange={(value) => setQuestionFormData({ ...questionFormData, correct_option: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4].map((num) => (
                              <SelectItem key={num} value={num.toString()}>Option {num}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Difficulty</Label>
                        <Select
                          value={questionFormData.difficulty}
                          onValueChange={(value: 'easy' | 'medium' | 'hard') => setQuestionFormData({ ...questionFormData, difficulty: value })}
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
                      <div className="space-y-1">
                        <Label className="text-xs">Year (optional)</Label>
                        <Input
                          value={questionFormData.year}
                          onChange={(e) => setQuestionFormData({ ...questionFormData, year: e.target.value })}
                          placeholder="2024"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Explanation (optional)</Label>
                      <Textarea
                        value={questionFormData.explanation}
                        onChange={(e) => setQuestionFormData({ ...questionFormData, explanation: e.target.value })}
                        placeholder="Explain the answer..."
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsQuestionFormOpen(false);
                          resetQuestionForm();
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (!questionFormData.text1 || !questionFormData.option1 || !questionFormData.option2 || !questionFormData.option3 || !questionFormData.option4) {
                            toast.error('Please fill all required fields');
                            return;
                          }
                          createQuestion.mutate({
                            ...questionFormData,
                            content_node_id: manageQuestionsNode!.id,
                          });
                        }}
                        disabled={createQuestion.isPending}
                        className="flex-1"
                      >
                        {createQuestion.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Add Question
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Questions List */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Existing Questions ({nodeQuestions?.length || 0})
                </h4>
                {isLoadingQuestions ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : nodeQuestions && nodeQuestions.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {nodeQuestions.map((q, idx) => (
                      <div key={q.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-2">{idx + 1}. {q.text1}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Answer: Option {q.correct_option}
                              </Badge>
                              {q.difficulty && (
                                <Badge variant="secondary" className="text-xs">
                                  {q.difficulty}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => deleteQuestionMutation.mutate(q.id)}
                            disabled={deleteQuestionMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No questions yet. Add your first question above!</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

interface TreeNodeComponentProps {
  node: ContentNode;
  level: number;
  examId: string;
  onEdit: (node: ContentNode) => void;
  onDelete: (node: ContentNode) => void;
  onAddChild: (parentId: string, type: NodeType) => void;
  getChildType: (parentType: NodeType) => NodeType;
  onManageQuestions: (node: ContentNode) => void;
}

const TreeNodeComponent = ({ node, level, examId, onEdit, onDelete, onAddChild, getChildType, onManageQuestions }: TreeNodeComponentProps) => {
  const [isOpen, setIsOpen] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const config = nodeTypeConfig[node.node_type];
  const Icon = config.icon;
  const canAddChildren = node.node_type !== 'TOPIC';
  const isTopic = node.node_type === 'TOPIC';

  return (
    <div className={cn(level > 0 && 'ml-6 border-l-2 border-border pl-4')}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
          {/* Expand/Collapse */}
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <button className="p-1 hover:bg-muted rounded transition-colors">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-6" />
          )}

          {/* Drag handle (placeholder) */}
          <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />

          {/* Icon */}
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg border', config.color)}>
            <Icon className="h-4 w-4" />
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{node.title}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {config.label}
              </Badge>
              {node.question_count !== undefined && node.question_count > 0 && (
                <span>{node.question_count} questions</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            {isTopic && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManageQuestions(node)}
                className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <HelpCircle className="h-4 w-4" />
                Questions
              </Button>
            )}
            {canAddChildren && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddChild(node.id, getChildType(node.node_type))}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(node)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(node)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Children */}
        {hasChildren && (
          <CollapsibleContent className="mt-1">
            {node.children!.map((child) => (
              <TreeNodeComponent
                key={child.id}
                node={child}
                level={level + 1}
                examId={examId}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddChild={onAddChild}
                getChildType={getChildType}
                onManageQuestions={onManageQuestions}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
};

export default AdminExamStructure;
