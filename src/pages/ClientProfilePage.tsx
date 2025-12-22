import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  IconButton,
  Dialog,
  TextField,
  Container,
  Avatar,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  useTheme,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  SwipeableDrawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Alert,
} from '@mui/material';
import {
  ArrowBack,
  Payment,
  AttachMoney,
  Business,
  Person,
  Phone,
  Email,
  LocationOn,
  Add,
  TrendingDown,
  AccountBalance,
  CheckCircle,
  WhatsApp,
  CalendarMonth,
  Edit,
  Delete,
  History,
  ChevronLeft,
  ChevronRight,
  Today,
  CreditCard,
  Receipt,
  Description,
  PictureAsPdf,
} from '@mui/icons-material';
import { useDataStore } from '@/store/useDataStore';
import { useForm, Controller } from 'react-hook-form';
import { formatCurrency } from '@/utils/calculations';
import { generateWhatsAppStatement } from '@/utils/whatsappExport';
import { generateExpenseInvoicePDF } from '@/utils/pdfGenerator';
import { CloseExpensesDialog } from '@/components/CloseExpensesDialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import type { Payment as PaymentType, Expense, StandaloneDebt, Client } from '@/types';

dayjs.locale('ar');

const clientSchema = z.object({
  name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  phone: z.string().min(10, 'رقم الهاتف غير صحيح'),
  address: z.string().min(5, 'العنوان يجب أن يكون 5 أحرف على الأقل'),
  type: z.enum(['company', 'individual']),
});

type ClientFormData = z.infer<typeof clientSchema>;

export const ClientProfilePage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const { clients, payments, expenses, standaloneDebts, expenseInvoices, addPayment, addExpense, updateExpense, deleteExpense, addStandaloneDebt, updateStandaloneDebt, deleteStandaloneDebt, closeExpensesAndCreateInvoice, updateClient, deleteClient } = useDataStore();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [debtDialogOpen, setDebtDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingDebt, setEditingDebt] = useState<StandaloneDebt | null>(null);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [closeExpensesDialogOpen, setCloseExpensesDialogOpen] = useState(false);
  const [editClientDialogOpen, setEditClientDialogOpen] = useState(false);

  const client = clients.find((c) => c.id === clientId);
  
  // Client Edit Form
  const {
    control: clientControl,
    handleSubmit: handleClientSubmit,
    reset: resetClient,
    formState: { errors: clientErrors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name || '',
      email: client?.email || '',
      phone: client?.phone || '',
      address: client?.address || '',
      type: client?.type || 'individual',
    },
  });

  // Update form when client changes
  useEffect(() => {
    if (client) {
      resetClient({
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        type: client.type,
      });
    }
  }, [client, resetClient]);
  
  // Payment Form
  const {
    control: paymentControl,
    handleSubmit: handlePaymentSubmit,
    reset: resetPayment,
  } = useForm({
    defaultValues: {
      amount: 0,
      paymentMethod: 'cash' as const,
      paymentDate: dayjs().format('YYYY-MM-DD'),
      notes: '',
    },
  });

  // Expense Form
  const {
    control: expenseControl,
    handleSubmit: handleExpenseSubmit,
    reset: resetExpense,
    setValue: setExpenseValue,
  } = useForm({
    defaultValues: {
      description: '',
      amount: 0,
      category: 'مواد',
      date: dayjs().format('YYYY-MM-DD'),
      notes: '',
    },
  });

  // Debt Form
  const {
    control: debtControl,
    handleSubmit: handleDebtSubmit,
    reset: resetDebt,
    setValue: setDebtValue,
  } = useForm({
    defaultValues: {
      description: '',
      amount: 0,
      date: dayjs().format('YYYY-MM-DD'),
      notes: '',
    },
  });

  const clientExpenses = useMemo(
    () => expenses
      .filter((exp) => exp.clientId === clientId)
      .sort((a, b) => dayjs(b.date).diff(dayjs(a.date))),
    [expenses, clientId]
  );

  const clientPayments = useMemo(
    () => payments
      .filter((pay) => pay.clientId === clientId)
      .sort((a, b) => dayjs(b.paymentDate).diff(dayjs(a.paymentDate))),
    [payments, clientId]
  );

  const clientDebts = useMemo(
    () => standaloneDebts
      .filter((debt) => debt.clientId === clientId)
      .sort((a, b) => dayjs(b.date).diff(dayjs(a.date))),
    [standaloneDebts, clientId]
  );

  const clientExpenseInvoices = useMemo(
    () => expenseInvoices
      .filter((inv) => inv.clientId === clientId)
      .sort((a, b) => dayjs(b.issueDate).diff(dayjs(a.issueDate))),
    [expenseInvoices, clientId]
  );

  // Group expenses by date
  const expensesByDate = useMemo(() => {
    const grouped = new Map<string, Expense[]>();
    clientExpenses.forEach((exp) => {
      const dateKey = dayjs(exp.date).format('YYYY-MM-DD');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(exp);
    });
    return Array.from(grouped.entries()).sort((a, b) => dayjs(b[0]).diff(dayjs(a[0])));
  }, [clientExpenses]);

  // Get expenses for selected month
  const selectedMonthExpenses = useMemo(() => {
    return clientExpenses.filter((exp) => 
      dayjs(exp.date).isSame(selectedDate, 'month')
    );
  }, [clientExpenses, selectedDate]);

  const summary = useMemo(() => {
    const totalExpenses = clientExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalDebts = clientDebts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
    const totalPaid = clientPayments.reduce((sum, pay) => sum + pay.amount, 0);
    const remainingBalance = totalExpenses + totalDebts - totalPaid;

    return {
      totalExpenses,
      totalDebts,
      totalPaid,
      remainingBalance,
      expenseCount: clientExpenses.length,
      debtCount: clientDebts.length,
      paymentCount: clientPayments.length,
    };
  }, [clientExpenses, clientDebts, clientPayments]);

  const handleExportWhatsApp = async () => {
    if (!client) return;
    
    setIsExporting(true);
    try {
      await generateWhatsAppStatement(
        client,
        clientExpenses,
        summary.totalExpenses,
        summary.totalPaid,
        summary.remainingBalance
      );
    } catch (error) {
      console.error('Error exporting:', error);
      alert('حدث خطأ في التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseValue('description', expense.description);
    setExpenseValue('amount', expense.amount);
    setExpenseValue('category', expense.category);
    setExpenseValue('date', expense.date);
    setExpenseValue('notes', expense.notes || '');
    setExpenseDialogOpen(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      try {
        await deleteExpense(expenseId);
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  const handleEditDebt = (debt: StandaloneDebt) => {
    setEditingDebt(debt);
    setDebtValue('description', debt.description);
    setDebtValue('amount', debt.amount);
    setDebtValue('date', debt.date);
    setDebtValue('notes', debt.notes || '');
    setDebtDialogOpen(true);
  };

  const handleDeleteDebt = async (debtId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الدين؟')) {
      try {
        await deleteStandaloneDebt(debtId);
      } catch (error) {
        console.error('Error deleting debt:', error);
      }
    }
  };

  const onSubmitPayment = async (data: any) => {
    try {
      const newPayment: PaymentType = {
        id: crypto.randomUUID(),
        invoiceId: '',
        clientId: clientId!,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate,
        notes: data.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addPayment(newPayment);
      
      // تنقيص الدفعة من الديون النشطة
      let remainingPayment = data.amount;
      const activeDebts = clientDebts.filter((d) => d.status === 'active');
      
      for (const debt of activeDebts) {
        if (remainingPayment <= 0) break;
        
        const paymentForThisDebt = Math.min(remainingPayment, debt.remainingAmount);
        remainingPayment -= paymentForThisDebt;

        const newPaidAmount = debt.paidAmount + paymentForThisDebt;
        const newRemainingAmount = debt.amount - newPaidAmount;

        await updateStandaloneDebt(debt.id, {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          status: newRemainingAmount <= 0 ? 'paid' : 'active',
        });
      }
      setPaymentDialogOpen(false);
      resetPayment();
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  const onSubmitExpense = async (data: any) => {
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          description: data.description,
          amount: data.amount,
          category: data.category,
          date: data.date,
          notes: data.notes,
        });
        setEditingExpense(null);
      } else {
        const newExpense: Expense = {
          id: crypto.randomUUID(),
          clientId: clientId!,
          description: data.description,
          amount: data.amount,
          category: data.category,
          date: data.date,
          notes: data.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await addExpense(newExpense);
      }
      setExpenseDialogOpen(false);
      resetExpense();
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  const onSubmitDebt = async (data: any) => {
    try {
      if (editingDebt) {
        await updateStandaloneDebt(editingDebt.id, {
          description: data.description,
          amount: data.amount,
          remainingAmount: data.amount - editingDebt.paidAmount,
          date: data.date,
          notes: data.notes,
        });
        setEditingDebt(null);
      } else {
        const newDebt: StandaloneDebt = {
          id: crypto.randomUUID(),
          clientId: clientId!,
          description: data.description,
          amount: data.amount,
          paidAmount: 0,
          remainingAmount: data.amount,
          status: 'active',
          date: data.date,
          notes: data.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await addStandaloneDebt(newDebt);
      }
      setDebtDialogOpen(false);
      resetDebt();
    } catch (error) {
      console.error('Error saving debt:', error);
    }
  };

  if (!client) {
  return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>العميل غير موجود</Typography>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/clients')} sx={{ mt: 2 }}>
        العودة
      </Button>
      </Box>
    );
  }

  const actions = [
    { icon: <AttachMoney />, name: 'إضافة مصروف', onClick: () => { setEditingExpense(null); setExpenseDialogOpen(true); }, color: theme.palette.primary.main },
    { icon: <CreditCard />, name: 'تسجيل دين', onClick: () => { setEditingDebt(null); setDebtDialogOpen(true); }, color: theme.palette.error.main },
    { icon: <Payment />, name: 'تسجيل دفعة', onClick: () => setPaymentDialogOpen(true), color: theme.palette.success.main },
    { icon: <History />, name: 'إغلاق مصروفات', onClick: () => setCloseExpensesDialogOpen(true), color: theme.palette.secondary.main },
  ];

  return (
                <Box
                  sx={{
        minHeight: '100vh',
        background: theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
        pb: 8,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: theme.palette.mode === 'light' 
            ? 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)'
            : 'linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)',
          pt: 2,
          pb: 4,
          px: 2,
        }}
      >
        <Container maxWidth="sm">
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <IconButton onClick={() => navigate('/clients')} sx={{ color: 'white' }}>
              <ArrowBack />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: 'white' }}>
                    {client.name}
                  </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Phone sx={{ fontSize: 14, opacity: 0.9 }} />
                <Typography variant="caption" sx={{ color: 'white', opacity: 0.95 }}>
                  {client.phone}
                </Typography>
              </Stack>
                </Box>
            <Stack direction="row" spacing={0.5}>
              <IconButton
                onClick={() => setEditClientDialogOpen(true)}
                sx={{
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                }}
                size="small"
              >
                <Edit fontSize="small" />
              </IconButton>
              <IconButton
                onClick={() => {
                  if (window.confirm('هل أنت متأكد من حذف هذا العميل؟')) {
                    deleteClient(client.id);
                    navigate('/clients');
                  }
                }}
                sx={{
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                }}
                size="small"
              >
                <Delete fontSize="small" />
              </IconButton>
              <Button
                variant="contained"
                size="small"
                onClick={handleExportWhatsApp}
                disabled={isExporting}
                sx={{
                  bgcolor: 'success.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'success.dark' },
                  fontWeight: 700,
                  minWidth: 'auto',
                  px: 2,
                }}
              >
                <WhatsApp sx={{ fontSize: 20 }} />
              </Button>
            </Stack>
          </Stack>

          {/* Summary Cards */}
          <Grid container spacing={1.5}>
            <Grid item xs={3}>
              <Card
                sx={{
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: 'none',
                }}
              >
                <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                  <TrendingDown sx={{ fontSize: 18, mb: 0.5, opacity: 0.9 }} />
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', fontSize: '0.6rem' }}>
                    المصروفات
                    </Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ mt: 0.5, fontSize: '0.85rem' }}>
                    {formatCurrency(summary.totalExpenses)}
                    </Typography>
                </CardContent>
              </Card>
                </Grid>

            <Grid item xs={3}>
              <Card
                sx={{
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: 'none',
                }}
              >
                <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                  <CreditCard sx={{ fontSize: 18, mb: 0.5, opacity: 0.9 }} />
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', fontSize: '0.6rem' }}>
                    الديون
                    </Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ mt: 0.5, fontSize: '0.85rem' }}>
                    {formatCurrency(summary.totalDebts)}
                    </Typography>
                </CardContent>
              </Card>
                </Grid>

            <Grid item xs={3}>
              <Card
                sx={{
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: 'none',
                }}
              >
                <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 18, mb: 0.5, opacity: 0.9 }} />
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', fontSize: '0.6rem' }}>
                    المدفوع
                    </Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ mt: 0.5, fontSize: '0.85rem' }}>
                    {formatCurrency(summary.totalPaid)}
                    </Typography>
                </CardContent>
              </Card>
                </Grid>

            <Grid item xs={3}>
              <Card
                sx={{
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: 'none',
                }}
              >
                <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                  <AccountBalance sx={{ fontSize: 18, mb: 0.5, opacity: 0.9 }} />
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', fontSize: '0.6rem' }}>
                    المتبقي
                    </Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ mt: 0.5, fontSize: '0.85rem' }}>
                    {formatCurrency(summary.remainingBalance)}
                    </Typography>
        </CardContent>
      </Card>
                </Grid>
              </Grid>
        </Container>
      </Box>

      {/* Content */}
      <Container maxWidth="sm" sx={{ mt: -2 }}>
        {/* Month Navigator */}
        <Card sx={{ mb: 2, borderRadius: 2.5 }}>
          <CardContent sx={{ p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <IconButton onClick={() => setSelectedDate(selectedDate.subtract(1, 'month'))} size="small">
                <ChevronRight />
              </IconButton>
              
              <Button
                onClick={() => setCalendarOpen(true)}
                startIcon={<CalendarMonth />}
                sx={{ fontWeight: 700 }}
              >
                {selectedDate.format('MMMM YYYY')}
              </Button>
              
              <IconButton 
                onClick={() => setSelectedDate(selectedDate.add(1, 'month'))}
                disabled={selectedDate.isSame(dayjs(), 'month')}
          size="small"
        >
                <ChevronLeft />
              </IconButton>
            </Stack>
            
            {!selectedDate.isSame(dayjs(), 'month') && (
              <Button
                fullWidth
                size="small"
                onClick={() => setSelectedDate(dayjs())}
                startIcon={<Today />}
                sx={{ mt: 1 }}
              >
                العودة للشهر الحالي
              </Button>
            )}
        </CardContent>
      </Card>

        {/* Month Summary */}
        {selectedMonthExpenses.length > 0 && (
          <Card sx={{ mb: 2, borderRadius: 2.5, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight={700}>
                  مصروفات {selectedDate.format('MMMM')}:
              </Typography>
                <Typography variant="h6" fontWeight={900} color="primary.main">
                  {formatCurrency(selectedMonthExpenses.reduce((sum, e) => sum + e.amount, 0))}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Close Expenses Button */}
        {clientExpenses.filter((e) => !e.isClosed).length > 0 && (
          <Card sx={{ mb: 2, borderRadius: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body1" fontWeight={700} sx={{ mb: 0.5 }}>
                    إغلاق المصروفات وإنشاء فاتورة
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {clientExpenses.filter((e) => !e.isClosed).length} مصروف غير مغلق
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Receipt />}
                  onClick={() => setCloseExpensesDialogOpen(true)}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  إغلاق المصروفات
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Expenses by Date */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, px: 0.5 }}>
            <Typography variant="h6" fontWeight={700}>
              المصروفات اليومية
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip 
                label={`${clientExpenses.length}`}
          size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={() => { setEditingExpense(null); setExpenseDialogOpen(true); }}
                sx={{ borderRadius: 1.5 }}
              >
                جديد
              </Button>
            </Stack>
          </Stack>
          
          <Stack spacing={2}>
            {expensesByDate.length === 0 ? (
              <Card sx={{ borderRadius: 2.5, textAlign: 'center', py: 6 }}>
                <AttachMoney sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                <Typography color="text.secondary" sx={{ mb: 1 }}>
                  لا توجد مصروفات
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  ابدأ بإضافة المصروفات اليومية
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<Add />}
                  onClick={() => { setEditingExpense(null); setExpenseDialogOpen(true); }}
                  sx={{ borderRadius: 2 }}
                >
                  إضافة مصروف
                </Button>
              </Card>
            ) : (
              expensesByDate
                .filter(([date]) => dayjs(date).isSame(selectedDate, 'month'))
                .map(([date, dayExpenses]) => {
                  const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
                  const isToday = dayjs(date).isSame(dayjs(), 'day');
                  
                  return (
                    <Box key={date}>
                      <Card
                        sx={{
                          borderRadius: 2.5,
                          bgcolor: isToday ? 'primary.main' : 'primary.light',
                          color: 'white',
                          mb: 1,
                          boxShadow: theme.palette.mode === 'light' 
                            ? '0 2px 8px rgba(25,118,210,0.2)' 
                            : '0 2px 8px rgba(0,0,0,0.3)',
                        }}
                      >
                        <CardContent sx={{ p: 1.5 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              {isToday && (
                        <Chip
                                  label="⭐ اليوم"
                          size="small"
                                  sx={{ 
                                    height: 24, 
                                    fontSize: '0.7rem',
                                    bgcolor: 'rgba(255,255,255,0.25)',
                                    color: 'white',
                                    fontWeight: 700,
                                  }}
                                />
                              )}
                              <Typography variant="body1" fontWeight={800}>
                                {dayjs(date).format('dddd، DD MMMM')}
                              </Typography>
                            </Stack>
                            <Stack alignItems="flex-end">
                              <Typography variant="h6" fontWeight={900}>
                                {formatCurrency(dayTotal)}
                              </Typography>
                              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                {dayExpenses.length} عملية
                              </Typography>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>

                      <Stack spacing={1}>
                        {dayExpenses.map((expense) => (
                          <Card
                            key={expense.id}
                            sx={{
                              borderRadius: 2,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                              border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                              bgcolor: 'background.paper',
                            }}
                          >
                            <CardContent sx={{ p: 2 }}>
                              <Stack direction="row" spacing={2} alignItems="flex-start">
                                {/* Icon */}
                                <Box
                                  sx={{
                                    width: 45,
                                    height: 45,
                                    borderRadius: 2,
                                    bgcolor: 'primary.light',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Typography fontSize="1.5rem">
                                    {expense.category === 'إسمنت' ? '⚫' :
                                     expense.category === 'حديد' ? '🔩' :
                                     expense.category === 'رمل' ? '🏖️' :
                                     expense.category === 'عمالة' ? '👷' :
                                     expense.category === 'معدات' ? '⚙️' :
                                     expense.category === 'نقل' ? '🚚' :
                                     expense.category === 'وقود' ? '⛽' :
                                     expense.category === 'كهرباء' ? '💡' :
                                     expense.category === 'ماء' ? '💧' : '📋'}
                                  </Typography>
      </Box>

                                {/* Content */}
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                  <Typography variant="body1" fontWeight={700} noWrap>
                                    {expense.description}
              </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {expense.category}
                                  </Typography>
                                  {expense.notes && (
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                      💬 {expense.notes}
                                    </Typography>
                                  )}
              </Box>

                                {/* Amount and Actions */}
                                <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
                                  <Typography variant="h6" fontWeight={900} color="primary.main">
                                    {formatCurrency(expense.amount)}
                                  </Typography>
                                  <Stack direction="row" spacing={0.5}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEditExpense(expense)}
                                      sx={{ 
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                        '&:hover': { bgcolor: 'primary.dark' },
                                        width: 28,
                                        height: 28,
                                      }}
                                    >
                                      <Edit sx={{ fontSize: 14 }} />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDeleteExpense(expense.id)}
                                      sx={{ 
                                        bgcolor: 'error.main',
                                        color: 'white',
                                        '&:hover': { bgcolor: 'error.dark' },
                                        width: 28,
                                        height: 28,
                                      }}
                                    >
                                      <Delete sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  </Stack>
                                </Stack>
                              </Stack>
            </CardContent>
          </Card>
                        ))}
                      </Stack>
                    </Box>
                  );
                })
            )}
          </Stack>
        </Box>

        {/* Debts Section */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, px: 0.5 }}>
            <Typography variant="h6" fontWeight={700}>
              الديون ({clientDebts.length})
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="error"
              startIcon={<Add />}
              onClick={() => { setEditingDebt(null); setDebtDialogOpen(true); }}
              sx={{ borderRadius: 1.5 }}
            >
              دين قديم
            </Button>
          </Stack>
          
          <Stack spacing={1.5}>
            {clientDebts.length === 0 ? (
              <Card sx={{ borderRadius: 2.5, textAlign: 'center', py: 6 }}>
                <CreditCard sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                  لا توجد ديون مسجلة
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  إذا كان هناك دين قديم، سجله هنا
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  startIcon={<Add />}
                  onClick={() => { setEditingDebt(null); setDebtDialogOpen(true); }}
                  sx={{ borderRadius: 2 }}
                >
                  تسجيل دين قديم
                </Button>
              </Card>
            ) : (
              clientDebts.map((debt) => (
                <Card
                  key={debt.id}
                  sx={{
                    borderRadius: 2.5,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: debt.status === 'active' ? '2px solid #ef4444' : 'none',
                    bgcolor: debt.status === 'paid' ? 'success.light' : 'background.paper',
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      {/* Icon */}
                      <Box
                        sx={{
                          width: 45,
                          height: 45,
                          borderRadius: 2,
                          bgcolor: debt.status === 'paid' ? 'success.light' : 'error.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CreditCard sx={{ 
                          color: debt.status === 'paid' ? 'success.main' : 'error.main',
                          fontSize: 24,
                        }} />
                      </Box>

                      {/* Content */}
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body1" fontWeight={800}>
                          {debt.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          📅 {dayjs(debt.date).format('DD MMMM YYYY')}
                        </Typography>
                        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              الإجمالي
                            </Typography>
                            <Typography variant="body2" fontWeight={700}>
                              {formatCurrency(debt.amount)}
                            </Typography>
                          </Box>
                          {debt.paidAmount > 0 && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                المدفوع
                              </Typography>
                              <Typography variant="body2" fontWeight={700} color="success.main">
                                {formatCurrency(debt.paidAmount)}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                        {debt.notes && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            💬 {debt.notes}
                          </Typography>
                        )}
                      </Box>

                      {/* Amount and Actions */}
                      <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
                        <Chip
                          label={debt.status === 'paid' ? '✅ مدفوع' : '⚠️ نشط'}
                          size="small"
                          color={debt.status === 'paid' ? 'success' : 'error'}
                          sx={{ height: 24, fontSize: '0.7rem', fontWeight: 700 }}
                        />
                        <Typography variant="h6" fontWeight={900} color={debt.status === 'paid' ? 'success.main' : 'error.main'}>
                          {formatCurrency(debt.remainingAmount)}
                        </Typography>
                        {debt.status === 'active' && (
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleEditDebt(debt)}
                              sx={{ 
                                bgcolor: 'primary.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'primary.dark' },
                                width: 28,
                                height: 28,
                              }}
                            >
                              <Edit sx={{ fontSize: 14 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteDebt(debt.id)}
                              sx={{ 
                                bgcolor: 'error.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'error.dark' },
                                width: 28,
                                height: 28,
                              }}
                            >
                              <Delete sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Stack>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        </Box>

        {/* Expense Invoices Section */}
        {clientExpenseInvoices.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, px: 0.5 }}>
              <Typography variant="h6" fontWeight={700}>
                فواتير المصروفات ({clientExpenseInvoices.length})
              </Typography>
            </Stack>
            
            <Stack spacing={1.5}>
              {clientExpenseInvoices.map((invoice) => (
                <Card
                  key={invoice.id}
                  sx={{
                    borderRadius: 2.5,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: '2px solid #8b5cf6',
                    bgcolor: 'white',
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      {/* Icon */}
                      <Box
                        sx={{
                          width: 45,
                          height: 45,
                          borderRadius: 2,
                          bgcolor: 'secondary.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Receipt sx={{ color: 'secondary.main', fontSize: 24 }} />
                      </Box>

                      {/* Content */}
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body1" fontWeight={800}>
                          {invoice.invoiceNumber}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          📅 {dayjs(invoice.startDate).format('DD/MM/YYYY')} - {dayjs(invoice.endDate).format('DD/MM/YYYY')}
                        </Typography>
                        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              عدد المصروفات
                            </Typography>
                            <Typography variant="body2" fontWeight={700}>
                              {invoice.expenses.length}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              الإجمالي
                            </Typography>
                            <Typography variant="body2" fontWeight={700} color="success.main">
                              {formatCurrency(invoice.totalAmount)}
                            </Typography>
                          </Box>
                        </Stack>
                        {invoice.notes && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            💬 {invoice.notes}
                          </Typography>
                        )}
                      </Box>

                      {/* Actions */}
                      <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
                        <Chip
                          label={
                            invoice.status === 'paid' ? '✅ مدفوعة' :
                            invoice.status === 'sent' ? '📤 مرسلة' : '📝 مسودة'
                          }
                          size="small"
                          color={invoice.status === 'paid' ? 'success' : 'default'}
                          sx={{ height: 24, fontSize: '0.7rem', fontWeight: 700 }}
                        />
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              if (client) {
                                generateExpenseInvoicePDF(invoice, client);
                              }
                            }}
                            sx={{ 
                              bgcolor: 'error.main',
                              color: 'white',
                              '&:hover': { bgcolor: 'error.dark' },
                              width: 28,
                              height: 28,
                            }}
                            title="PDF"
                          >
                            <PictureAsPdf sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        )}

        {/* Payments */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5, px: 0.5 }}>
            المدفوعات ({clientPayments.length})
          </Typography>
          <Stack spacing={1.5}>
            {clientPayments.length === 0 ? (
              <Card sx={{ borderRadius: 2.5, textAlign: 'center', py: 4 }}>
                <Payment sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
                <Typography color="text.secondary">
                  لا توجد مدفوعات
                </Typography>
              </Card>
            ) : (
              clientPayments.slice(0, 10).map((payment) => (
                <Card
                  key={payment.id}
                  sx={{
                    borderRadius: 2.5,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            bgcolor: 'success.light',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CheckCircle sx={{ color: 'success.main', fontSize: 24 }} />
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            دفعة
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(payment.paymentDate).format('DD MMM YYYY')}
                          </Typography>
                        </Box>
                      </Stack>
                      <Typography variant="h6" fontWeight={800} color="success.main">
                        {formatCurrency(payment.amount)}
                      </Typography>
                    </Stack>
                    <Box sx={{ mt: 1 }}>
                        <Chip
                        label={
                          payment.paymentMethod === 'cash' ? '💵 نقداً' :
                          payment.paymentMethod === 'check' ? '📝 شيك' :
                          payment.paymentMethod === 'bank_transfer' ? '🏦 تحويل' : '💳 بطاقة'
                        }
                        size="small"
                        sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }}
                      />
                    </Box>
        </CardContent>
      </Card>
              ))
            )}
          </Stack>
    </Box>
      </Container>

      {/* Calendar Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        onOpen={() => setCalendarOpen(true)}
        sx={{
          '& .MuiDrawer-paper': {
            borderRadius: '20px 20px 0 0',
            maxHeight: '70vh',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom textAlign="center">
            اختر شهر
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <List>
            {Array.from({ length: 12 }, (_, i) => {
              const month = dayjs().subtract(i, 'month');
              const monthExpenses = clientExpenses.filter((exp) =>
                dayjs(exp.date).isSame(month, 'month')
              );
              const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

              return (
                <ListItem key={i} disablePadding>
                  <ListItemButton
                    onClick={() => {
                      setSelectedDate(month);
                      setCalendarOpen(false);
                    }}
                    selected={selectedDate.isSame(month, 'month')}
                    sx={{ borderRadius: 2, mb: 0.5 }}
                  >
                    <ListItemText
                      primary={month.format('MMMM YYYY')}
                      secondary={monthExpenses.length > 0 ? `${monthExpenses.length} مصروف` : 'لا توجد مصروفات'}
                    />
                    {monthTotal > 0 && (
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {formatCurrency(monthTotal)}
                      </Typography>
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </SwipeableDrawer>

      {/* Speed Dial */}
      <SpeedDial
        ariaLabel="إجراءات سريعة"
        sx={{ position: 'fixed', bottom: 20, left: 20 }}
        icon={<SpeedDialIcon />}
        open={speedDialOpen}
        onOpen={() => setSpeedDialOpen(true)}
        onClose={() => setSpeedDialOpen(false)}
        FabProps={{
          sx: {
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          },
        }}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={() => {
              action.onClick();
              setSpeedDialOpen(false);
            }}
            FabProps={{
              sx: {
                bgcolor: action.color,
                '&:hover': { bgcolor: action.color },
              },
            }}
          />
        ))}
      </SpeedDial>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} fullScreen>
        <form onSubmit={handlePaymentSubmit(onSubmitPayment)}>
          <Box sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white', p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton onClick={() => setPaymentDialogOpen(false)} sx={{ color: 'white' }}>
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                تسجيل دفعة
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ p: 2 }}>
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              ✅ الدفعة ستُطرح من الديون النشطة تلقائياً
            </Alert>
            
            <Stack spacing={2.5}>
              <Controller
                name="amount"
                control={paymentControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="المبلغ"
                    type="number"
                    placeholder="1000"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />

              <Controller
                name="paymentMethod"
                control={paymentControl}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>طريقة الدفع</InputLabel>
                    <Select {...field} label="طريقة الدفع">
                      <MenuItem value="cash">💵 نقداً</MenuItem>
                      <MenuItem value="check">📝 شيك</MenuItem>
                      <MenuItem value="bank_transfer">🏦 تحويل بنكي</MenuItem>
                      <MenuItem value="credit_card">💳 بطاقة ائتمان</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="paymentDate"
                control={paymentControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="تاريخ الدفع"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />

              <Controller
                name="notes"
                control={paymentControl}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="ملاحظات" multiline rows={2} />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button onClick={() => setPaymentDialogOpen(false)} fullWidth size="large" sx={{ borderRadius: 2, py: 1.5 }}>
                إلغاء
              </Button>
              <Button type="submit" variant="contained" color="success" fullWidth size="large" sx={{ borderRadius: 2, py: 1.5 }}>
                تسجيل الدفعة
              </Button>
            </Stack>
          </Box>
        </form>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog
        open={expenseDialogOpen}
        onClose={() => { setExpenseDialogOpen(false); setEditingExpense(null); }}
        fullScreen
      >
        <form onSubmit={handleExpenseSubmit(onSubmitExpense)}>
          <Box sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white', p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton onClick={() => { setExpenseDialogOpen(false); setEditingExpense(null); }} sx={{ color: 'white' }}>
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                {editingExpense ? 'تعديل مصروف' : 'إضافة مصروف'}
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ p: 2 }}>
            <Stack spacing={2.5}>
              <Controller
                name="description"
                control={expenseControl}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="الوصف" placeholder="مثال: شراء إسمنت" />
                )}
              />

              <Controller
                name="amount"
                control={expenseControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="المبلغ"
                    type="number"
                    placeholder="1000"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />

              <Controller
                name="category"
                control={expenseControl}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>الفئة</InputLabel>
                    <Select {...field} label="الفئة">
                      <MenuItem value="مواد">🧱 مواد بناء</MenuItem>
                      <MenuItem value="إسمنت">⚫ إسمنت</MenuItem>
                      <MenuItem value="حديد">🔩 حديد</MenuItem>
                      <MenuItem value="رمل">🏖️ رمل وزلط</MenuItem>
                      <MenuItem value="عمالة">👷 عمالة</MenuItem>
                      <MenuItem value="معدات">⚙️ معدات</MenuItem>
                      <MenuItem value="نقل">🚚 نقل</MenuItem>
                      <MenuItem value="وقود">⛽ وقود</MenuItem>
                      <MenuItem value="كهرباء">💡 كهرباء</MenuItem>
                      <MenuItem value="ماء">💧 ماء</MenuItem>
                      <MenuItem value="أخرى">📋 أخرى</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="date"
                control={expenseControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="التاريخ"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />

              <Controller
                name="notes"
                control={expenseControl}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="ملاحظات" multiline rows={2} />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button onClick={() => { setExpenseDialogOpen(false); setEditingExpense(null); }} fullWidth size="large" sx={{ borderRadius: 2, py: 1.5 }}>
                إلغاء
              </Button>
              <Button type="submit" variant="contained" color="primary" fullWidth size="large" sx={{ borderRadius: 2, py: 1.5 }}>
                {editingExpense ? 'حفظ' : 'إضافة'}
              </Button>
            </Stack>
          </Box>
        </form>
      </Dialog>

      {/* Debt Dialog */}
      <Dialog
        open={debtDialogOpen}
        onClose={() => { setDebtDialogOpen(false); setEditingDebt(null); }}
        fullScreen
      >
        <form onSubmit={handleDebtSubmit(onSubmitDebt)}>
          <Box sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white', p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton onClick={() => { setDebtDialogOpen(false); setEditingDebt(null); }} sx={{ color: 'white' }}>
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                {editingDebt ? 'تعديل دين' : 'تسجيل دين'}
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ p: 2 }}>
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              📌 الدين يُسجل بشكل مستقل (ليس مصروف)
            </Alert>
            
            <Stack spacing={2.5}>
              <Controller
                name="description"
                control={debtControl}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="الوصف" placeholder="مثال: دين قديم - نوفمبر" />
                )}
              />

              <Controller
                name="amount"
                control={debtControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="المبلغ"
                    type="number"
                    placeholder="5000"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />

              <Controller
                name="date"
                control={debtControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="التاريخ"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />

              <Controller
                name="notes"
                control={debtControl}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="ملاحظات" multiline rows={2} />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button onClick={() => { setDebtDialogOpen(false); setEditingDebt(null); }} fullWidth size="large" sx={{ borderRadius: 2, py: 1.5 }}>
                إلغاء
              </Button>
              <Button type="submit" variant="contained" color="error" fullWidth size="large" sx={{ borderRadius: 2, py: 1.5 }}>
                {editingDebt ? 'حفظ' : 'تسجيل'}
              </Button>
            </Stack>
          </Box>
        </form>
      </Dialog>

      {/* Close Expenses Dialog */}
      {client && (
        <CloseExpensesDialog
          open={closeExpensesDialogOpen}
          onClose={() => setCloseExpensesDialogOpen(false)}
          onConfirm={async (expenseIds, startDate, endDate, notes) => {
            await closeExpensesAndCreateInvoice(expenseIds, client.id, startDate, endDate, notes);
          }}
          expenses={clientExpenses}
          clientName={client.name}
        />
      )}

      {/* Edit Client Dialog */}
      <Dialog
        open={editClientDialogOpen}
        onClose={() => {
          setEditClientDialogOpen(false);
          resetClient({
            name: client?.name || '',
            email: client?.email || '',
            phone: client?.phone || '',
            address: client?.address || '',
            type: client?.type || 'individual',
          });
        }}
        fullScreen
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: theme.palette.mode === 'dark' ? '#1e293b' : '#fff',
          },
        }}
      >
        <form onSubmit={handleClientSubmit((data) => {
          if (client) {
            updateClient(client.id, data);
            setEditClientDialogOpen(false);
          }
        })}>
          <Box
            sx={{
              background: theme.palette.mode === 'light' 
                ? 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)'
                : 'linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)',
              color: 'white',
              p: 2,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton onClick={() => {
                setEditClientDialogOpen(false);
                resetClient({
                  name: client?.name || '',
                  email: client?.email || '',
                  phone: client?.phone || '',
                  address: client?.address || '',
                  type: client?.type || 'individual',
                });
              }} sx={{ color: 'white' }}>
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                تعديل بيانات العميل
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Controller
                name="name"
                control={clientControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="الاسم"
                    error={!!clientErrors.name}
                    helperText={clientErrors.name?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />

              <Controller
                name="type"
                control={clientControl}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>النوع</InputLabel>
                    <Select {...field} label="النوع" sx={{ borderRadius: 2 }}>
                      <MenuItem value="individual">فرد</MenuItem>
                      <MenuItem value="company">شركة</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="phone"
                control={clientControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="رقم الهاتف"
                    error={!!clientErrors.phone}
                    helperText={clientErrors.phone?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />

              <Controller
                name="email"
                control={clientControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="البريد الإلكتروني"
                    type="email"
                    error={!!clientErrors.email}
                    helperText={clientErrors.email?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />

              <Controller
                name="address"
                control={clientControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="العنوان"
                    multiline
                    rows={3}
                    error={!!clientErrors.address}
                    helperText={clientErrors.address?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button
                onClick={() => {
                  setEditClientDialogOpen(false);
                  resetClient({
                    name: client?.name || '',
                    email: client?.email || '',
                    phone: client?.phone || '',
                    address: client?.address || '',
                    type: client?.type || 'individual',
                  });
                }}
                fullWidth
                size="large"
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                حفظ التعديلات
              </Button>
            </Stack>
          </Box>
        </form>
      </Dialog>
    </Box>
  );
};
