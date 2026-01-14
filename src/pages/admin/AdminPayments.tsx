import { useState } from 'react';
import { CheckCircle2, XCircle, Clock, Search, Loader2 } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const AdminPayments = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch all payments
  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          exams (title),
          profiles!payments_user_id_fkey (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Update payment mutation
  const updatePayment = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: 'approved' | 'rejected'; notes: string }) => {
      const { error } = await supabase
        .from('payments')
        .update({ status, admin_notes: notes })
        .eq('id', id);

      if (error) throw error;

      // If approved, create subscription
      if (status === 'approved' && selectedPayment) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month subscription

        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: selectedPayment.user_id,
            exam_id: selectedPayment.exam_id,
            expires_at: expiresAt.toISOString(),
            is_active: true,
          });

        if (subError) throw subError;
      }
    },
    onSuccess: () => {
      toast.success(`Payment ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      setSelectedPayment(null);
      setActionType(null);
      setAdminNotes('');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update payment');
    },
  });

  const filteredPayments = payments?.filter((payment) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      payment.transaction_id?.toLowerCase().includes(searchLower) ||
      payment.exams?.title?.toLowerCase().includes(searchLower) ||
      payment.profiles?.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const handleAction = (payment: any, action: 'approve' | 'reject') => {
    setSelectedPayment(payment);
    setActionType(action);
    setAdminNotes('');
  };

  const confirmAction = () => {
    if (!selectedPayment || !actionType) return;
    updatePayment.mutate({
      id: selectedPayment.id,
      status: actionType === 'approve' ? 'approved' : 'rejected',
      notes: adminNotes,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold mb-2">Payments</h1>
          <p className="text-muted-foreground">Approve or reject payment submissions</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by transaction ID, exam, or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Payments List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredPayments && filteredPayments.length > 0 ? (
              <div className="space-y-4">
                {filteredPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-xl border',
                      payment.status === 'pending' && 'bg-warning/5 border-warning/20',
                      payment.status === 'approved' && 'bg-success/5 border-success/20',
                      payment.status === 'rejected' && 'bg-destructive/5 border-destructive/20'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-full',
                          payment.status === 'pending' && 'bg-warning/10 text-warning',
                          payment.status === 'approved' && 'bg-success/10 text-success',
                          payment.status === 'rejected' && 'bg-destructive/10 text-destructive'
                        )}
                      >
                        {payment.status === 'pending' && <Clock className="h-6 w-6" />}
                        {payment.status === 'approved' && <CheckCircle2 className="h-6 w-6" />}
                        {payment.status === 'rejected' && <XCircle className="h-6 w-6" />}
                      </div>
                      <div>
                        <div className="font-medium">{payment.profiles?.full_name || 'Unknown User'}</div>
                        <div className="text-sm text-muted-foreground">
                          {payment.exams?.title} • {payment.payment_method.toUpperCase()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          TxID: {payment.transaction_id}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold">PKR {payment.amount}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {payment.status === 'pending' ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleAction(payment, 'approve')}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAction(payment, 'reject')}
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Badge
                          variant={payment.status === 'approved' ? 'default' : 'destructive'}
                          className="capitalize"
                        >
                          {payment.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No payments found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <Dialog open={!!selectedPayment && !!actionType} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'Approve Payment' : 'Reject Payment'}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'approve'
                  ? 'This will grant the user full access to the exam.'
                  : 'This will reject the payment request.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50 text-sm">
                <div><strong>User:</strong> {selectedPayment?.profiles?.full_name}</div>
                <div><strong>Exam:</strong> {selectedPayment?.exams?.title}</div>
                <div><strong>Amount:</strong> PKR {selectedPayment?.amount}</div>
                <div><strong>Transaction ID:</strong> {selectedPayment?.transaction_id}</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes (optional)</label>
                <Textarea
                  placeholder="Add any notes about this decision..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPayment(null)}>
                Cancel
              </Button>
              <Button
                variant={actionType === 'approve' ? 'default' : 'destructive'}
                onClick={confirmAction}
                disabled={updatePayment.isPending}
              >
                {updatePayment.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : actionType === 'approve' ? (
                  'Approve'
                ) : (
                  'Reject'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminPayments;
