import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, FolderTree, MoreVertical, Eye, EyeOff } from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

interface Exam {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  demo_questions_limit: number;
  demo_attempts_per_day: number;
  created_at: string;
}

const AdminExams = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [deleteExam, setDeleteExam] = useState<Exam | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    demo_questions_limit: 10,
    demo_attempts_per_day: 3,
  });

  // Fetch exams
  const { data: exams, isLoading } = useQuery({
    queryKey: ['admin-exams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('title');
      
      if (error) throw error;
      return data as Exam[];
    },
  });

  // Create exam mutation
  const createExam = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('exams').insert({
        title: data.title,
        slug: data.slug.toLowerCase().replace(/\s+/g, '-'),
        description: data.description || null,
        demo_questions_limit: data.demo_questions_limit,
        demo_attempts_per_day: data.demo_attempts_per_day,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Exam created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create exam');
    },
  });

  // Update exam mutation
  const updateExam = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('exams')
        .update({
          title: data.title,
          slug: data.slug.toLowerCase().replace(/\s+/g, '-'),
          description: data.description || null,
          demo_questions_limit: data.demo_questions_limit,
          demo_attempts_per_day: data.demo_attempts_per_day,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Exam updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
      setEditingExam(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update exam');
    },
  });

  // Toggle active mutation
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('exams')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
    },
  });

  // Delete exam mutation
  const deleteExamMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Exam deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
      setDeleteExam(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete exam');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      description: '',
      demo_questions_limit: 10,
      demo_attempts_per_day: 3,
    });
  };

  const openEditDialog = (exam: Exam) => {
    setFormData({
      title: exam.title,
      slug: exam.slug,
      description: exam.description || '',
      demo_questions_limit: exam.demo_questions_limit,
      demo_attempts_per_day: exam.demo_attempts_per_day,
    });
    setEditingExam(exam);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingExam) {
      updateExam.mutate({ id: editingExam.id, data: formData });
    } else {
      createExam.mutate(formData);
    }
  };

  const filteredExams = exams?.filter((exam) =>
    exam.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold mb-2">Exams</h1>
            <p className="text-muted-foreground">Manage your exam catalog</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Exam
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search exams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Exams List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Exams ({filteredExams?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredExams && filteredExams.length > 0 ? (
              <div className="space-y-3">
                {filteredExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FolderTree className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{exam.title}</span>
                          {exam.is_active ? (
                            <Badge variant="default" className="bg-success text-success-foreground">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          /{exam.slug} • Demo: {exam.demo_questions_limit} questions, {exam.demo_attempts_per_day} attempts/day
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/admin/exams/${exam.id}/structure`}>
                          <FolderTree className="h-4 w-4" />
                          Structure
                        </Link>
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(exam)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleActive.mutate({ id: exam.id, is_active: !exam.is_active })}
                          >
                            {exam.is_active ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteExam(exam)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No exams found</p>
                <Button variant="link" onClick={() => setIsCreateOpen(true)}>
                  Create your first exam
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isCreateOpen || !!editingExam} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingExam(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingExam ? 'Edit Exam' : 'Create Exam'}</DialogTitle>
              <DialogDescription>
                {editingExam ? 'Update exam details' : 'Add a new exam to your catalog'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      title: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                    });
                  }}
                  placeholder="CSS (Central Superior Services)"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="css"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the exam..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="demo_limit">Demo Questions</Label>
                  <Input
                    id="demo_limit"
                    type="number"
                    min={1}
                    value={formData.demo_questions_limit}
                    onChange={(e) => setFormData({ ...formData, demo_questions_limit: parseInt(e.target.value) || 10 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo_attempts">Demo Attempts/Day</Label>
                  <Input
                    id="demo_attempts"
                    type="number"
                    min={1}
                    value={formData.demo_attempts_per_day}
                    onChange={(e) => setFormData({ ...formData, demo_attempts_per_day: parseInt(e.target.value) || 3 })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateOpen(false);
                  setEditingExam(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createExam.isPending || updateExam.isPending}>
                  {(createExam.isPending || updateExam.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingExam ? 'Save Changes' : 'Create Exam'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteExam} onOpenChange={() => setDeleteExam(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Exam</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deleteExam?.title}"? This will also delete all content nodes and questions. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteExam(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteExam && deleteExamMutation.mutate(deleteExam.id)}
                disabled={deleteExamMutation.isPending}
              >
                {deleteExamMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminExams;
