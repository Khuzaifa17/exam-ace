import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Shield, Crown, Edit2, Save, X, Sparkles } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Profile = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) setFullName(data.full_name || '');
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user role
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.role || 'user';
    },
    enabled: !!user?.id,
  });

  // Fetch active subscriptions
  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('subscriptions')
        .select(`
          *,
          exams (title, slug)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString());
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (newName: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newName })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  const handleSave = () => {
    if (!fullName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    updateProfile.mutate(fullName.trim());
  };

  const handleCancel = () => {
    setFullName(profile?.full_name || '');
    setIsEditing(false);
  };

  const isPro = subscriptions && subscriptions.length > 0;
  const isLoading = profileLoading || roleLoading || subsLoading;

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and view your subscription status
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Account Information</CardTitle>
                    <CardDescription>Your personal details</CardDescription>
                  </div>
                  {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={handleCancel}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={updateProfile.isPending}>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar & Name */}
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    {isLoading ? (
                      <Skeleton className="h-8 w-48" />
                    ) : isEditing ? (
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your name"
                          className="max-w-xs"
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="text-xl font-semibold">
                          {profile?.full_name || 'User'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
                            {userRole === 'admin' ? (
                              <>
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                              </>
                            ) : (
                              'User'
                            )}
                          </Badge>
                          <Badge variant={isPro ? 'default' : 'outline'} className={isPro ? 'bg-secondary text-secondary-foreground' : ''}>
                            {isPro ? (
                              <>
                                <Crown className="h-3 w-3 mr-1" />
                                Pro
                              </>
                            ) : (
                              'Free'
                            )}
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  {isLoading ? (
                    <Skeleton className="h-6 w-64" />
                  ) : (
                    <p className="text-foreground">{user?.email}</p>
                  )}
                </div>

                {/* Member Since */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Member Since
                  </Label>
                  {isLoading ? (
                    <Skeleton className="h-6 w-40" />
                  ) : (
                    <p className="text-foreground">
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Status Card */}
          <div className="space-y-6">
            <Card className={isPro ? 'border-secondary/50 bg-gradient-to-br from-secondary/5 to-secondary/10' : ''}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {isPro ? (
                    <>
                      <Crown className="h-5 w-5 text-secondary" />
                      Pro Member
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 text-muted-foreground" />
                      Free Plan
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : isPro ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      You have access to premium content for:
                    </p>
                    <ul className="space-y-2">
                      {subscriptions?.map((sub) => (
                        <li key={sub.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{sub.exams?.title}</span>
                          <span className="text-muted-foreground">
                            {new Date(sub.expires_at).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Upgrade to Pro to unlock:
                    </p>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        Unlimited practice questions
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        All mock tests
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        Detailed explanations
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        Progress tracking
                      </li>
                    </ul>
                    <Button className="w-full" variant="default" onClick={() => navigate('/exams')}>
                      Upgrade to Pro
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Role Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Your Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        userRole === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {userRole === 'admin' ? (
                          <Shield className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold capitalize">{userRole}</p>
                        <p className="text-xs text-muted-foreground">
                          {userRole === 'admin'
                            ? 'Full access to admin panel'
                            : 'Standard user access'}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button variant="outline" className="w-full" onClick={() => navigate('/admin')}>
                        Go to Admin Panel
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
