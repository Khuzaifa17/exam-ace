import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CreditCard, Smartphone, Building2, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const paymentMethods = [
  { id: 'jazzcash', name: 'JazzCash', icon: Smartphone, account: '0300-1234567' },
  { id: 'easypaisa', name: 'Easypaisa', icon: Smartphone, account: '0300-7654321' },
  { id: 'nayapay', name: 'NayaPay', icon: CreditCard, account: '0300-1111111' },
  { id: 'bank', name: 'Bank Transfer', icon: Building2, account: 'HBL - 1234567890123' },
] as const;

const Payments = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const examId = searchParams.get('exam');

  const [paymentMethod, setPaymentMethod] = useState<string>('jazzcash');
  const [transactionId, setTransactionId] = useState('');

  // Fetch exam details
  const { data: exam } = useQuery({
    queryKey: ['exam-for-payment', examId],
    queryFn: async () => {
      if (!examId) return null;
      const { data } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .maybeSingle();
      return data;
    },
    enabled: !!examId,
  });

  // Fetch existing payments
  const { data: existingPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['user-payments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('payments')
        .select(`
          *,
          exams (title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Submit payment mutation
  const submitPayment = useMutation({
    mutationFn: async () => {
      if (!user?.id || !examId) throw new Error('Missing data');

      const { error } = await supabase.from('payments').insert({
        user_id: user.id,
        exam_id: examId,
        payment_method: paymentMethod as 'jazzcash' | 'easypaisa' | 'nayapay' | 'bank',
        transaction_id: transactionId,
        amount: 1500, // Fixed price for now
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Payment submitted! We will verify and activate your access within 24 hours.');
      setTransactionId('');
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit payment');
    },
  });

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId.trim()) {
      toast.error('Please enter your transaction ID');
      return;
    }
    submitPayment.mutate();
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="font-display text-3xl font-bold mb-2">Payments</h1>
        <p className="text-muted-foreground mb-8">
          Unlock full access to exams with manual payment verification
        </p>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Submit Payment</CardTitle>
                <CardDescription>
                  {exam ? `Unlock ${exam.title}` : 'Select an exam from the exams page to unlock'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!examId ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No exam selected</p>
                    <Button onClick={() => navigate('/exams')}>Browse Exams</Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Price */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Amount to pay</span>
                        <span className="font-display text-2xl font-bold text-primary">
                          PKR 1,500
                        </span>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-3">
                      <Label>Payment Method</Label>
                      <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                        <div className="grid grid-cols-2 gap-3">
                          {paymentMethods.map((method) => (
                            <label
                              key={method.id}
                              className={cn(
                                'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors',
                                paymentMethod === method.id
                                  ? 'border-primary bg-accent'
                                  : 'border-border hover:border-primary/30'
                              )}
                            >
                              <RadioGroupItem value={method.id} className="sr-only" />
                              <method.icon className="h-5 w-5 text-primary" />
                              <div>
                                <div className="font-medium text-sm">{method.name}</div>
                                <div className="text-xs text-muted-foreground">{method.account}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Instructions */}
                    <div className="p-4 rounded-xl bg-muted/50 text-sm">
                      <h4 className="font-semibold mb-2">Payment Instructions</h4>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Send PKR 1,500 to the selected account</li>
                        <li>Copy the transaction ID from your payment receipt</li>
                        <li>Paste the transaction ID below</li>
                        <li>Wait for verification (usually within 24 hours)</li>
                      </ol>
                    </div>

                    {/* Transaction ID */}
                    <div className="space-y-2">
                      <Label htmlFor="transactionId">Transaction ID</Label>
                      <Input
                        id="transactionId"
                        placeholder="Enter your transaction ID"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        className="h-12"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="hero"
                      size="lg"
                      className="w-full"
                      disabled={submitPayment.isPending}
                    >
                      {submitPayment.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Payment'
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : existingPayments && existingPayments.length > 0 ? (
                  <div className="space-y-3">
                    {existingPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                      >
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full',
                            payment.status === 'approved' && 'bg-success/10 text-success',
                            payment.status === 'pending' && 'bg-warning/10 text-warning',
                            payment.status === 'rejected' && 'bg-destructive/10 text-destructive'
                          )}
                        >
                          {payment.status === 'approved' && <CheckCircle2 className="h-5 w-5" />}
                          {payment.status === 'pending' && <Clock className="h-5 w-5" />}
                          {payment.status === 'rejected' && <AlertCircle className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {payment.exams?.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">PKR {payment.amount}</div>
                          <div
                            className={cn(
                              'text-xs capitalize',
                              payment.status === 'approved' && 'text-success',
                              payment.status === 'pending' && 'text-warning',
                              payment.status === 'rejected' && 'text-destructive'
                            )}
                          >
                            {payment.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No payments yet</p>
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

export default Payments;
