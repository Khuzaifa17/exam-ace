import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, BookOpen, Clock, Trophy, Play, Lock, FolderOpen, FileText, ChevronDown, AlertCircle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useExamAccess } from '@/hooks/useExamAccess';

interface ContentNode {
  id: string;
  title: string;
  node_type: 'TRACK' | 'SUBJECT' | 'CHAPTER' | 'TOPIC';
  parent_id: string | null;
  order_index: number;
  children?: ContentNode[];
}

const ExamDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch exam details
  const { data: exam, isLoading: examLoading } = useQuery({
    queryKey: ['exam', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch content nodes (tree structure)
  const { data: contentNodes, isLoading: nodesLoading } = useQuery({
    queryKey: ['content-nodes', exam?.id],
    queryFn: async () => {
      if (!exam?.id) return [];
      
      const { data, error } = await supabase
        .from('content_nodes')
        .select('*')
        .eq('exam_id', exam.id)
        .order('order_index');
      
      if (error) throw error;
      return data as ContentNode[];
    },
    enabled: !!exam?.id,
  });

  // Check subscription and demo status
  const { hasSubscription, demoCompleted, demoQuestionsLimit, canAccess } = useExamAccess(exam?.id || null);

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

  const tree = contentNodes ? buildTree(contentNodes) : [];

  const handleStartPractice = (nodeId?: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/practice?exam=${exam?.id}${nodeId ? `&node=${nodeId}` : ''}`);
  };

  if (examLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-6 w-full max-w-xl mb-8" />
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
            <div>
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!exam) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold mb-4">Exam Not Found</h1>
          <p className="text-muted-foreground mb-6">The exam you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/exams">Browse All Exams</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/exams" className="hover:text-primary transition-colors">
            Exams
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{exam.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h1 className="font-display text-3xl md:text-4xl font-bold">{exam.title}</h1>
            {hasSubscription ? (
              <Badge variant="default" className="bg-success">Full Access</Badge>
            ) : demoCompleted ? (
              <Badge variant="destructive">Demo Expired</Badge>
            ) : (
              <Badge variant="secondary">Demo Mode</Badge>
            )}
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl">
            {exam.description || 'Comprehensive practice for this competitive exam.'}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Content Tree */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold mb-6 flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                Exam Structure
              </h2>

              {nodesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              ) : tree.length > 0 ? (
                <div className="space-y-3">
                  {tree.map((node) => (
                    <TreeNode
                      key={node.id}
                      node={node}
                      level={0}
                      onPractice={handleStartPractice}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No content structure available yet.</p>
                  <p className="text-sm mt-2">Check back soon for updates.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Start Card */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Quick Start</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">Practice Mode</div>
                    <div className="text-muted-foreground text-xs">Pick topics, instant feedback</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20 text-secondary-foreground">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">Mock Test</div>
                    <div className="text-muted-foreground text-xs">Timed, random questions</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={() => handleStartPractice()}
                >
                  <Play className="h-4 w-4" />
                  Start Practice
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => navigate(`/mock?exam=${exam.id}`)}
                >
                  Take Mock Test
                </Button>
              </div>
            </div>

            {/* Access Card */}
            {!hasSubscription && (
              <div className={cn(
                "glass-card rounded-2xl p-6 border-2",
                demoCompleted ? "border-destructive/50" : "border-secondary/30"
              )}>
                <div className="flex items-center gap-2 mb-4">
                  {demoCompleted ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Lock className="h-5 w-5 text-secondary" />
                  )}
                  <h3 className="font-display text-lg font-semibold">
                    {demoCompleted ? 'Demo Completed' : 'Unlock Full Access'}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {demoCompleted 
                    ? 'You have completed your one-time free demo. Subscribe to continue practicing.'
                    : `Get unlimited access to all ${exam.title} questions and mock tests.`
                  }
                </p>
                <ul className="text-sm space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    All questions unlocked
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Unlimited mock tests
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Detailed analytics
                  </li>
                </ul>
                <Button variant="gold" size="lg" className="w-full" asChild>
                  <Link to={`/payments?exam=${exam.id}`}>
                    {demoCompleted ? 'Subscribe Now' : 'Unlock Now'}
                  </Link>
                </Button>
              </div>
            )}

            {/* Demo Info - only show if not subscribed and demo not completed */}
            {!hasSubscription && !demoCompleted && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-4">
                <p className="font-medium mb-1">One-Time Demo:</p>
                <ul className="space-y-1">
                  <li>• {demoQuestionsLimit || exam.demo_questions_limit} questions only</li>
                  <li>• Practice OR Mock Test (one time only)</li>
                  <li>• Subscribe after demo for unlimited access</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

interface TreeNodeProps {
  node: ContentNode;
  level: number;
  onPractice: (nodeId: string) => void;
}

const TreeNode = ({ node, level, onPractice }: TreeNodeProps) => {
  const [isOpen, setIsOpen] = useState(level < 1);
  const hasChildren = node.children && node.children.length > 0;

  const nodeTypeStyles = {
    TRACK: 'bg-primary/10 text-primary border-primary/20',
    SUBJECT: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    CHAPTER: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    TOPIC: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  };

  const nodeTypeIcons = {
    TRACK: FolderOpen,
    SUBJECT: BookOpen,
    CHAPTER: FileText,
    TOPIC: FileText,
  };

  const Icon = nodeTypeIcons[node.node_type];

  return (
    <div className={cn('border-l-2 border-border', level > 0 && 'ml-4')}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            'flex items-center justify-between gap-3 p-3 rounded-xl transition-colors hover:bg-muted/50',
            level === 0 && 'border border-border bg-card'
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            {hasChildren && (
              <CollapsibleTrigger asChild>
                <button className="p-1 hover:bg-muted rounded-md transition-colors">
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform',
                      isOpen && 'rotate-180'
                    )}
                  />
                </button>
              </CollapsibleTrigger>
            )}
            {!hasChildren && <div className="w-6" />}
            
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg border', nodeTypeStyles[node.node_type])}>
              <Icon className="h-4 w-4" />
            </div>
            
            <div className="min-w-0">
              <div className="font-medium truncate">{node.title}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {node.node_type.toLowerCase()}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPractice(node.id)}
            className="shrink-0"
          >
            Practice
          </Button>
        </div>

        {hasChildren && (
          <CollapsibleContent className="pt-2">
            {node.children!.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                onPractice={onPractice}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
};

export default ExamDetail;
