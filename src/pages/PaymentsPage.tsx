import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container,
  Stack,
  useTheme,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Delete,
  ArrowBack,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { useDataStore } from '@/store/useDataStore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Payment } from '@/types';
import { formatCurrency } from '@/utils/calculations';
import dayjs from 'dayjs';

const paymentSchema = z.object({
  clientId: z.string().min(1, 'يجب اختيار عميل'),
  invoiceId: z.string().optional(),
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من 0'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'check', 'credit_card']),
  paymentDate: z.string(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export const PaymentsPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { clients, invoices, payments, addPayment, updatePayment, deletePayment } = useDataStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      clientId: '',
      invoiceId: '',
      amount: 0,
      paymentMethod: 'cash',
      paymentDate: dayjs().format('YYYY-MM-DD'),
      notes: '',
    },
  });

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const invoice = payment.invoiceId ? invoices.find((i) => i.id === payment.invoiceId) : null;
      const client = clients.find((c) => c.id === payment.clientId);
      const matchesSearch =
        invoice?.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        searchQuery === '';
      const matchesMethod = methodFilter === 'all' || payment.paymentMethod === methodFilter;
      return matchesSearch && matchesMethod;
    });
  }, [payments, invoices, clients, searchQuery, methodFilter]);

  const handleOpenDialog = (payment?: Payment) => {
    if (payment) {
      setEditingPayment(payment);
      reset({
        clientId: payment.clientId,
        invoiceId: payment.invoiceId || '',
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentDate: dayjs(payment.paymentDate).format('YYYY-MM-DD'),
        notes: payment.notes || '',
      });
    } else {
      setEditingPayment(null);
      reset({
        clientId: '',
        invoiceId: '',
        amount: 0,
        paymentMethod: 'cash',
        paymentDate: dayjs().format('YYYY-MM-DD'),
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPayment(null);
    reset();
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      const client = clients.find((c) => c.id === data.clientId);
      if (!client) return;

      if (editingPayment) {
        await updatePayment(editingPayment.id, {
          clientId: data.clientId,
          invoiceId: data.invoiceId || '',
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          paymentDate: data.paymentDate,
          notes: data.notes || '',
        });
      } else {
        const newPayment: Payment = {
          id: crypto.randomUUID(),
          invoiceId: data.invoiceId || '',
          clientId: data.clientId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          paymentDate: data.paymentDate,
          notes: data.notes || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await addPayment(newPayment);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving payment:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الدفعة؟')) {
      await deletePayment(id);
    }
  };

  const getPaymentMethodLabel = (method: Payment['paymentMethod']) => {
    switch (method) {
      case 'cash':
        return 'نقدي';
      case 'bank_transfer':
        return 'تحويل بنكي';
      case 'check':
        return 'شيك';
      case 'credit_card':
        return 'بطاقة ائتمان';
      default:
        return method;
    }
  };

  const totalPayments = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
        pb: 3,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: theme.palette.mode === 'light' 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
          pt: 2,
          pb: 3,
          px: 2,
        }}
      >
        <Container maxWidth="sm">
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <IconButton onClick={() => navigate('/')} sx={{ color: 'white' }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" fontWeight={800} sx={{ color: 'white', flexGrow: 1 }}>
              المدفوعات ({payments.length})
            </Typography>
            <Button
              variant="contained"
              onClick={() => handleOpenDialog()}
              sx={{
                bgcolor: 'white',
                color: 'success.main',
                fontWeight: 700,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                borderRadius: 2,
              }}
              startIcon={<Add />}
            >
              جديدة
            </Button>
          </Stack>

          {/* Stats Card */}
          <Card
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 2.5,
              color: 'white',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                    إجمالي المدفوعات
                  </Typography>
                  <Typography variant="h5" fontWeight={900}>
                    {formatCurrency(totalPayments)}
                  </Typography>
                </Box>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    width: 50,
                    height: 50,
                  }}
                >
                  <PaymentIcon sx={{ fontSize: 28 }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>

          {/* Search & Filter */}
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              placeholder="ابحث عن دفعة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  borderRadius: 2,
                  '& fieldset': { border: 'none' },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth size="small">
              <Select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                sx={{
                  bgcolor: 'white',
                  borderRadius: 2,
                  '& fieldset': { border: 'none' },
                }}
              >
                <MenuItem value="all">كل طرق الدفع</MenuItem>
                <MenuItem value="cash">💵 نقدي</MenuItem>
                <MenuItem value="bank_transfer">🏦 تحويل بنكي</MenuItem>
                <MenuItem value="check">📝 شيك</MenuItem>
                <MenuItem value="credit_card">💳 بطاقة ائتمان</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Container>
      </Box>

      {/* Payments List */}
      <Container maxWidth="sm" sx={{ mt: -2 }}>
        <Stack spacing={1.5}>
          {filteredPayments.length === 0 ? (
            <Card sx={{ borderRadius: 2.5, textAlign: 'center', py: 6, bgcolor: 'background.paper' }}>
              <PaymentIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                لا توجد مدفوعات
              </Typography>
              <Button
                variant="contained"
                color="success"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
                sx={{ mt: 2, borderRadius: 2 }}
              >
                إضافة أول دفعة
              </Button>
            </Card>
          ) : (
            filteredPayments.map((payment) => {
              const invoice = invoices.find((i) => i.id === payment.invoiceId);
              const client = clients.find((c) => c.id === payment.clientId);
              
              return (
                <Card
                  key={payment.id}
                  sx={{
                    borderRadius: 2.5,
                    boxShadow: theme.palette.mode === 'light'
                      ? '0 2px 8px rgba(0,0,0,0.06)'
                      : '0 2px 8px rgba(0,0,0,0.3)',
                    bgcolor: 'background.paper',
                    border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Avatar
                        sx={{
                          bgcolor: 'success.light',
                          width: 40,
                          height: 40,
                        }}
                      >
                        <PaymentIcon sx={{ color: 'success.main', fontSize: 20 }} />
                      </Avatar>
                      
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {client?.name}
                          </Typography>
                          <Chip
                            label={getPaymentMethodLabel(payment.paymentMethod)}
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.6rem' }}
                          />
                        </Stack>
                        
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          {payment.invoiceId && invoice ? `${invoice.invoiceNumber} • ` : ''}{dayjs(payment.paymentDate).format('DD/MM/YYYY')}
                        </Typography>

                        <Typography 
                          variant="h6" 
                          fontWeight={800}
                          color="success.main"
                        >
                          {formatCurrency(payment.amount)}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(payment)}
                          sx={{ color: 'primary.main' }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(payment.id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>

                    {payment.notes && (
                      <>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="caption" color="text.secondary">
                          {payment.notes}
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </Stack>
      </Container>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullScreen
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: theme.palette.mode === 'dark' ? '#1e293b' : '#fff',
          },
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box
            sx={{
              background: theme.palette.mode === 'light' 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
              color: 'white',
              p: 2,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton onClick={handleCloseDialog} sx={{ color: 'white' }}>
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                {editingPayment ? 'تعديل دفعة' : 'إضافة دفعة جديدة'}
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Controller
                name="clientId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.clientId}>
                    <InputLabel>العميل</InputLabel>
                    <Select {...field} label="العميل" sx={{ borderRadius: 2 }}>
                      {clients.map((client) => (
                        <MenuItem key={client.id} value={client.id}>
                          {client.name} - {client.phone}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="invoiceId"
                control={control}
                render={({ field }) => {
                  const selectedClientId = watch('clientId');
                  const clientInvoices = selectedClientId
                    ? invoices.filter(
                        (inv) => inv.clientId === selectedClientId && inv.status !== 'paid'
                      )
                    : [];
                  
                  return (
                    <FormControl fullWidth disabled={!selectedClientId}>
                      <InputLabel>الفاتورة (اختياري)</InputLabel>
                      <Select 
                        {...field} 
                        value={field.value || ''}
                        label="الفاتورة (اختياري)" 
                        sx={{ borderRadius: 2 }}
                        onChange={(e) => field.onChange(e.target.value || undefined)}
                      >
                        <MenuItem value="">بدون فاتورة</MenuItem>
                        {clientInvoices.map((invoice) => (
                          <MenuItem key={invoice.id} value={invoice.id}>
                            {invoice.invoiceNumber} - {formatCurrency(invoice.total)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  );
                }}
              />

              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="المبلغ"
                    type="number"
                    error={!!errors.amount}
                    helperText={errors.amount?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />

              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>طريقة الدفع</InputLabel>
                    <Select {...field} label="طريقة الدفع" sx={{ borderRadius: 2 }}>
                      <MenuItem value="cash">💵 نقدي</MenuItem>
                      <MenuItem value="bank_transfer">🏦 تحويل بنكي</MenuItem>
                      <MenuItem value="check">📝 شيك</MenuItem>
                      <MenuItem value="credit_card">💳 بطاقة ائتمان</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="paymentDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="تاريخ الدفع"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />

              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="ملاحظات"
                    multiline
                    rows={3}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button
                onClick={handleCloseDialog}
                fullWidth
                size="large"
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="success"
                fullWidth
                size="large"
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                {editingPayment ? 'حفظ' : 'إضافة'}
              </Button>
            </Stack>
          </Box>
        </form>
      </Dialog>
    </Box>
  );
};

