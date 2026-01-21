import { useState } from 'react';
import { Users, Shield, User, Search, RotateCcw, ChevronDown, ChevronUp, Crown } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'user' | 'owner';
}

interface DemoUsage {
  id: string;
  user_id: string;
  exam_id: string;
  questions_attempted: number;
  demo_completed: boolean;
  exam_title?: string;
}

const AdminUsers = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { user: currentUser, isOwner: currentUserIsOwner } = useAuth();

  // Fetch profiles
  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserProfile[];
    },
  });

  // Fetch user roles
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*');

      if (error) throw error;
      return data as UserRole[];
    },
  });

  // Fetch demo usage with exam titles
  const { data: demoUsage, isLoading: demoLoading } = useQuery({
    queryKey: ['admin-demo-usage'],
    queryFn: async () => {
      const { data: usageData, error: usageError } = await supabase
        .from('demo_usage')
        .select('*');

      if (usageError) throw usageError;

      // Fetch exam titles
      const examIds = [...new Set(usageData.map(d => d.exam_id))];
      if (examIds.length === 0) return [];

      const { data: exams, error: examsError } = await supabase
        .from('exams')
        .select('id, title')
        .in('id', examIds);

      if (examsError) throw examsError;

      const examMap = new Map(exams.map(e => [e.id, e.title]));

      return usageData.map(usage => ({
        ...usage,
        exam_title: examMap.get(usage.exam_id) || 'Unknown Exam',
      })) as DemoUsage[];
    },
  });

  // Update role mutation
  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'admin' | 'user' }) => {
      const existingRole = userRoles?.find(r => r.user_id === userId);

      // Prevent modifying owner
      if (existingRole?.role === 'owner') {
        throw new Error('Cannot modify owner role');
      }

      // Use upsert to handle both insert and update cases
      // Users without an entry in user_roles default to 'user' role
      const { error } = await supabase
        .from('user_roles')
        .upsert(
          { user_id: userId, role: newRole },
          { onConflict: 'user_id' }
        );
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast.success('User role updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update role');
    },
  });

  // Reset single demo mutation
  const resetDemo = useMutation({
    mutationFn: async ({ userId, examId }: { userId: string; examId: string }) => {
      const { error } = await supabase
        .from('demo_usage')
        .delete()
        .eq('user_id', userId)
        .eq('exam_id', examId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-demo-usage'] });
      toast.success('Demo reset successfully');
    },
    onError: () => {
      toast.error('Failed to reset demo');
    },
  });

  // Reset all demos for a user
  const resetAllDemos = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('demo_usage')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-demo-usage'] });
      toast.success('All demos reset successfully');
    },
    onError: () => {
      toast.error('Failed to reset demos');
    },
  });

  const isLoading = profilesLoading || rolesLoading || demoLoading;

  const getUserRole = (userId: string): 'owner' | 'admin' | 'user' => {
    const role = userRoles?.find(r => r.user_id === userId);
    if (role?.role === 'owner') return 'owner';
    if (role?.role === 'admin') return 'admin';
    return 'user';
  };

  // Check if current user can modify target user's role
  const canModifyRole = (targetRole: 'owner' | 'admin' | 'user'): boolean => {
    // No one can modify owner
    if (targetRole === 'owner') return false;
    // Only owner can modify admins
    if (targetRole === 'admin') return currentUserIsOwner;
    // Owner and admins can modify users
    return true;
  };

  // Get available role options based on current user's permissions
  const getAvailableRoles = (targetRole: 'owner' | 'admin' | 'user'): ('admin' | 'user')[] => {
    if (targetRole === 'owner') return [];
    if (currentUserIsOwner) {
      // Owner can set any non-owner role
      return ['user', 'admin'];
    }
    // Admins can only promote to admin, not demote other admins
    if (targetRole === 'admin') return [];
    return ['user', 'admin'];
  };

  const getUserDemoUsage = (userId: string): DemoUsage[] => {
    return demoUsage?.filter(d => d.user_id === userId) || [];
  };

  const toggleUserExpanded = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const filteredProfiles = profiles?.filter(profile =>
    profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ownerCount = userRoles?.filter(r => r.role === 'owner').length || 0;
  const adminCount = userRoles?.filter(r => r.role === 'admin').length || 0;
  const totalUsers = profiles?.length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold mb-2">User Management</h1>
          <p className="text-muted-foreground">Manage registered users and their roles</p>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-display text-2xl font-bold">{totalUsers}</div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-secondary/50 bg-gradient-to-br from-secondary/5 to-secondary/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/20 text-secondary">
                  <Crown className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-display text-2xl font-bold">{ownerCount}</div>
                  <div className="text-sm text-muted-foreground">Owner</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 text-warning">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-display text-2xl font-bold">{adminCount}</div>
                  <div className="text-sm text-muted-foreground">Admins</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-display text-2xl font-bold">{totalUsers - adminCount - ownerCount}</div>
                  <div className="text-sm text-muted-foreground">Regular Users</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredProfiles && filteredProfiles.length > 0 ? (
              <div className="space-y-2">
                {filteredProfiles.map((profile) => {
                  const role = getUserRole(profile.user_id);
                  const userDemos = getUserDemoUsage(profile.user_id);
                  const isExpanded = expandedUsers.has(profile.user_id);
                  const isCurrentUser = currentUser?.id === profile.user_id;
                  const canModify = canModifyRole(role) && !isCurrentUser;
                  const availableRoles = getAvailableRoles(role);

                  return (
                    <Collapsible
                      key={profile.id}
                      open={isExpanded}
                      onOpenChange={() => toggleUserExpanded(profile.user_id)}
                    >
                      <div className={`rounded-lg border transition-colors ${
                        role === 'owner' 
                          ? 'border-secondary/50 bg-gradient-to-r from-secondary/5 to-transparent' 
                          : 'border-border hover:border-primary/30'
                      }`}>
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              role === 'owner' ? 'bg-secondary/20' : 'bg-muted'
                            }`}>
                              {profile.avatar_url ? (
                                <img
                                  src={profile.avatar_url}
                                  alt={profile.full_name || 'User'}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : role === 'owner' ? (
                                <Crown className="h-5 w-5 text-secondary" />
                              ) : (
                                <User className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {profile.full_name || 'Unnamed User'}
                                {role === 'owner' && (
                                  <span className="text-xs text-secondary font-normal">(Protected)</span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {profile.email || 'No email'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Joined {new Date(profile.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {role === 'owner' ? (
                              <Badge className="bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground">
                                <Crown className="h-3 w-3 mr-1" />
                                Owner
                              </Badge>
                            ) : (
                              <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
                                {role === 'admin' ? (
                                  <>
                                    <Shield className="h-3 w-3 mr-1" />
                                    Admin
                                  </>
                                ) : 'User'}
                              </Badge>
                            )}
                            
                            {canModify && availableRoles.length > 0 ? (
                              <Select
                                value={role}
                                onValueChange={(value: 'admin' | 'user') =>
                                  updateRole.mutate({ userId: profile.user_id, newRole: value })
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableRoles.map((r) => (
                                    <SelectItem key={r} value={r}>
                                      {r === 'admin' ? 'Admin' : 'User'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="w-32 h-9 flex items-center justify-center rounded-md border border-dashed border-muted-foreground/30 text-muted-foreground text-sm">
                                    {role === 'owner' ? 'Protected' : isCurrentUser ? 'You' : 'No access'}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {role === 'owner' 
                                    ? 'Owner role cannot be modified' 
                                    : isCurrentUser 
                                      ? 'You cannot change your own role'
                                      : 'Only Owner can modify admin roles'}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                                <span className="ml-1 text-xs">
                                  Demo ({userDemos.length})
                                </span>
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>

                        <CollapsibleContent>
                          <div className="px-4 pb-4 border-t border-border pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium">Demo Usage</h4>
                              {userDemos.length > 0 && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <RotateCcw className="h-3 w-3 mr-1" />
                                      Reset All Demos
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Reset All Demos?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        یہ action user کے تمام demos reset کر دے گا۔ User دوبارہ تمام exams کے demo attempt کر سکے گا۔
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => resetAllDemos.mutate(profile.user_id)}
                                      >
                                        Reset All
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>

                            {userDemos.length > 0 ? (
                              <div className="space-y-2">
                                {userDemos.map((demo) => (
                                  <div
                                    key={demo.id}
                                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div>
                                        <div className="font-medium text-sm">{demo.exam_title}</div>
                                        <div className="text-xs text-muted-foreground">
                                          Questions: {demo.questions_attempted} | 
                                          Status: {demo.demo_completed ? (
                                            <span className="text-destructive">Completed</span>
                                          ) : (
                                            <span className="text-success">In Progress</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <RotateCcw className="h-3 w-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Reset Demo?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            یہ action "{demo.exam_title}" کا demo reset کر دے گا۔ User دوبارہ اس exam کا demo attempt کر سکے گا۔
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => resetDemo.mutate({ 
                                              userId: profile.user_id, 
                                              examId: demo.exam_id 
                                            })}
                                          >
                                            Reset
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-sm text-muted-foreground">
                                No demo usage found
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No users found matching your search' : 'No users registered yet'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
