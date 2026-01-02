import React, { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
} from "@mui/material";
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
  TrendingUp,
  CheckCircle,
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
} from "@mui/icons-material";
import { useDataStore } from "@/store/useDataStore";
import { useForm, Controller } from "react-hook-form";
import { formatCurrency } from "@/utils/calculations";
import { generateExpenseInvoicePDF } from "@/utils/pdfGenerator";
import { CloseExpensesDialog } from "@/components/CloseExpensesDialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import type {
  Payment as PaymentType,
  Expense,
  StandaloneDebt,
  Client,
} from "@/types";

dayjs.locale("ar");

const clientSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  phone: z.string().min(10, "رقم الهاتف غير صحيح"),
  address: z.string().min(5, "العنوان يجب أن يكون 5 أحرف على الأقل"),
  type: z.enum(["company", "individual"]),
});

type ClientFormData = z.infer<typeof clientSchema>;

export const ClientProfilePage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();

  const {
    clients,
    payments,
    expenses,
    standaloneDebts,
    expenseInvoices,
    invoices,
    addPayment,
    updatePayment,
    deletePayment,
    addExpense,
    updateExpense,
    deleteExpense,
    addStandaloneDebt,
    updateStandaloneDebt,
    deleteStandaloneDebt,
    closeExpensesAndCreateInvoice,
    updateClient,
    deleteClient,
  } = useDataStore();

  // Refs for scrolling to sections
  const expensesRef = useRef<HTMLDivElement>(null);
  const paymentsRef = useRef<HTMLDivElement>(null);
  const debtsRef = useRef<HTMLDivElement>(null);
  const profitsRef = useRef<HTMLDivElement>(null);

  // Menu items for quick navigation
  const menuItems = [
    {
      title: "المصروفات",
      icon: TrendingDown,
      color: "#ef4444",
      bgColor: "#fee2e2",
      onClick: () => setExpensesListDialogOpen(true),
    },
    {
      title: "المدفوعات",
      icon: Payment,
      color: "#10b981",
      bgColor: "#d1fae5",
      onClick: () => setPaymentsListDialogOpen(true),
    },
    {
      title: "الديون",
      icon: CreditCard,
      color: "#f59e0b",
      bgColor: "#fef3c7",
      onClick: () => debtsRef.current?.scrollIntoView({ behavior: "smooth" }),
    },
    {
      title: "حساب الأرباح",
      icon: TrendingUp,
      color: "#3b82f6",
      bgColor: "#dbeafe",
      onClick: () => profitsRef.current?.scrollIntoView({ behavior: "smooth" }),
    },
  ];
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [debtDialogOpen, setDebtDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingDebt, setEditingDebt] = useState<StandaloneDebt | null>(null);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [closeExpensesDialogOpen, setCloseExpensesDialogOpen] = useState(false);
  const [editClientDialogOpen, setEditClientDialogOpen] = useState(false);
  const [expensesListDialogOpen, setExpensesListDialogOpen] = useState(false);
  const [paymentsListDialogOpen, setPaymentsListDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentType | null>(
    null
  );
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const client = clients.find((c) => c.id === clientId);
  const clientInitial =
    client?.name?.charAt(0)?.toUpperCase?.() || "ع";

  // Client Edit Form
  const {
    control: clientControl,
    handleSubmit: handleClientSubmit,
    reset: resetClient,
    formState: { errors: clientErrors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      address: client?.address || "",
      type: client?.type || "individual",
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
    setValue: setPaymentValue,
  } = useForm({
    defaultValues: {
      amount: "" as any,
      paymentMethod: "cash" as const,
      paymentDate: dayjs().format("YYYY-MM-DD"),
      invoiceId: "",
      notes: "",
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
      description: "",
      amount: "" as any,
      category: "مواد",
      date: dayjs().format("YYYY-MM-DD"),
      notes: "",
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
      description: "",
      amount: 0,
      date: dayjs().format("YYYY-MM-DD"),
      notes: "",
    },
  });

  const clientExpenses = useMemo(
    () =>
      expenses
        .filter((exp) => exp.clientId === clientId)
        .sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt))),
    [expenses, clientId]
  );

  const clientPayments = useMemo(
    () =>
      payments
        .filter((pay) => pay.clientId === clientId)
        .sort((a, b) => dayjs(b.paymentDate).diff(dayjs(a.paymentDate))),
    [payments, clientId]
  );

  const clientDebts = useMemo(
    () =>
      standaloneDebts
        .filter((debt) => debt.clientId === clientId)
        .sort((a, b) => dayjs(b.date).diff(dayjs(a.date))),
    [standaloneDebts, clientId]
  );

  const clientExpenseInvoices = useMemo(
    () =>
      expenseInvoices
        .filter((inv) => inv.clientId === clientId)
        .sort((a, b) => dayjs(b.issueDate).diff(dayjs(a.issueDate))),
    [expenseInvoices, clientId]
  );

  // Group expenses by date
  const expensesByDate = useMemo(() => {
    const grouped = new Map<string, Expense[]>();
    clientExpenses.forEach((exp) => {
      const dateKey = dayjs(exp.date).format("YYYY-MM-DD");
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(exp);
    });
    return Array.from(grouped.entries()).sort((a, b) =>
      dayjs(b[0]).diff(dayjs(a[0]))
    );
  }, [clientExpenses]);

  // Get expenses for selected month
  const selectedMonthExpenses = useMemo(() => {
    return clientExpenses.filter((exp) =>
      dayjs(exp.date).isSame(selectedDate, "month")
    );
  }, [clientExpenses, selectedDate]);

  const summary = useMemo(() => {
    const totalExpenses = clientExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );
    const totalDebts = clientDebts.reduce(
      (sum, debt) => sum + debt.remainingAmount,
      0
    );
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

  const handleEditExpense = (expense: Expense) => {
    console.log("Editing expense:", expense);
    setEditingExpense(expense);
    setExpenseValue("description", expense.description);
    setExpenseValue("amount", expense.amount);
    setExpenseValue("category", expense.category);
    setExpenseValue("date", expense.date);
    setExpenseValue("notes", expense.notes || "");
    setExpenseDialogOpen(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المصروف؟")) {
      try {
        console.log("Deleting expense:", expenseId);
        await deleteExpense(expenseId);
        console.log("Expense deleted successfully");
        setSnackbarMessage("تم الحذف بنجاح");
        setSnackbarOpen(true);
      } catch (error: any) {
        console.error("Error deleting expense:", error);
        const errorMessage =
          error?.message || error?.toString() || "حدث خطأ أثناء الحذف";
        setSnackbarMessage(errorMessage);
        setSnackbarOpen(true);
      }
    }
  };

  const handleEditDebt = (debt: StandaloneDebt) => {
    setEditingDebt(debt);
    setDebtValue("description", debt.description);
    setDebtValue("amount", debt.amount);
    setDebtValue("date", debt.date);
    setDebtValue("notes", debt.notes || "");
    setDebtDialogOpen(true);
  };

  const handleDeleteDebt = async (debtId: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الدين؟")) {
      try {
        await deleteStandaloneDebt(debtId);
      } catch (error) {
        console.error("Error deleting debt:", error);
      }
    }
  };

  const getPaymentMethodLabel = (
    method: PaymentType["paymentMethod"]
  ): string => {
    switch (method) {
      case "cash":
        return "نقدي";
      case "bank_transfer":
        return "تحويل بنكي";
      case "check":
        return "شيك";
      case "credit_card":
        return "بطاقة ائتمان";
      default:
        return method as string;
    }
  };

  const handleEditPayment = (payment: PaymentType) => {
    console.log("Editing payment:", payment);
    setEditingPayment(payment);
    setPaymentValue("amount", payment.amount);
    setPaymentValue("paymentMethod", payment.paymentMethod);
    setPaymentValue("paymentDate", payment.paymentDate);
    setPaymentValue("invoiceId", payment.invoiceId || "");
    setPaymentValue("notes", payment.notes || "");
    setPaymentDialogOpen(true);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذه الدفعة؟")) {
      try {
        console.log("Deleting payment:", paymentId);
        await deletePayment(paymentId);
        console.log("Payment deleted successfully");
        setSnackbarMessage("تم الحذف بنجاح");
        setSnackbarOpen(true);
      } catch (error: any) {
        console.error("Error deleting payment:", error);
        const errorMessage =
          error?.message || error?.toString() || "حدث خطأ أثناء الحذف";
        setSnackbarMessage(errorMessage);
        setSnackbarOpen(true);
      }
    }
  };

  const onSubmitPayment = async (data: any) => {
    try {
      const amount = parseFloat(data.amount) || 0;
      if (editingPayment) {
        await updatePayment(editingPayment.id, {
          amount: amount,
          paymentMethod: data.paymentMethod || "cash",
          paymentDate: data.paymentDate || dayjs().format("YYYY-MM-DD"),
          invoiceId: data.invoiceId || "",
          notes: data.notes || "",
        });
        setEditingPayment(null);
        setSnackbarMessage("تم التعديل بنجاح");
      } else {
        const newPayment: PaymentType = {
          id: crypto.randomUUID(),
          invoiceId: data.invoiceId || "",
          clientId: clientId!,
          amount: amount,
          paymentMethod: data.paymentMethod,
          paymentDate: data.paymentDate,
          notes: data.notes || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await addPayment(newPayment);

        // تنقيص الدفعة من الديون النشطة
        let remainingPayment = amount;
        const activeDebts = clientDebts.filter((d) => d.status === "active");

        for (const debt of activeDebts) {
          if (remainingPayment <= 0) break;

          const paymentForThisDebt = Math.min(
            remainingPayment,
            debt.remainingAmount
          );
          remainingPayment -= paymentForThisDebt;

          const newPaidAmount = debt.paidAmount + paymentForThisDebt;
          const newRemainingAmount = debt.amount - newPaidAmount;

          await updateStandaloneDebt(debt.id, {
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            status: newRemainingAmount <= 0 ? "paid" : "active",
          });
        }
        setSnackbarMessage("تمت الإضافة بنجاح");
      }
      setPaymentDialogOpen(false);
      resetPayment({
        amount: "" as any,
        paymentMethod: "cash",
        paymentDate: dayjs().format("YYYY-MM-DD"),
        invoiceId: "",
        notes: "",
      });
      // إعادة فتح قائمة المدفوعات
      setPaymentsListDialogOpen(true);
      setSnackbarOpen(true);
    } catch (error: any) {
      console.error("Error saving payment:", error);
      const errorMessage =
        error?.message || error?.toString() || "حدث خطأ أثناء الحفظ";
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
    }
  };

  const onSubmitExpense = async (data: any) => {
    try {
      const amount = parseFloat(data.amount) || 0;
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          description: data.description || "",
          amount: amount,
          category: data.category || "مواد",
          date: data.date || dayjs().format("YYYY-MM-DD"),
          notes: data.notes || "",
        });
        setEditingExpense(null);
        setSnackbarMessage("تم التعديل بنجاح");
      } else {
        const newExpense: Expense = {
          id: crypto.randomUUID(),
          clientId: clientId!,
          description: data.description,
          amount: amount,
          category: data.category,
          date: data.date,
          notes: data.notes,
          isClosed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await addExpense(newExpense);
        setEditingExpense(null);
        setSnackbarMessage("تمت الإضافة بنجاح");
      }
      setExpenseDialogOpen(false);
      resetExpense({
        description: "",
        amount: "" as any,
        category: "مواد",
        date: dayjs().format("YYYY-MM-DD"),
        notes: "",
      });
      // إعادة فتح قائمة المصروفات
      setExpensesListDialogOpen(true);
      setSnackbarOpen(true);
    } catch (error: any) {
      console.error("Error saving expense:", error);
      const errorMessage =
        error?.message || error?.toString() || "حدث خطأ أثناء الحفظ";
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
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
          status: "active",
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
      console.error("Error saving debt:", error);
    }
  };

  if (!client) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography>العميل غير موجود</Typography>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate("/clients")}
          sx={{ mt: 2 }}
        >
          العودة
        </Button>
      </Box>
    );
  }

  const actions = [
    {
      icon: <AttachMoney />,
      name: "إضافة مصروف",
      onClick: () => {
        setEditingExpense(null);
        setExpenseDialogOpen(true);
      },
      color: theme.palette.primary.main,
    },
    {
      icon: <CreditCard />,
      name: "تسجيل دين",
      onClick: () => {
        setEditingDebt(null);
        setDebtDialogOpen(true);
      },
      color: theme.palette.error.main,
    },
    {
      icon: <Payment />,
      name: "تسجيل دفعة",
      onClick: () => setPaymentDialogOpen(true),
      color: theme.palette.success.main,
    },
    {
      icon: <History />,
      name: "إغلاق مصروفات",
      onClick: () => setCloseExpensesDialogOpen(true),
      color: theme.palette.secondary.main,
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: theme.palette.mode === "dark" ? "#0f172a" : "#f8fafc",
        pb: 8,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background:
            theme.palette.mode === "light"
              ? "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)"
              : "linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)",
          pt: 2,
          pb: 4,
          px: 2,
        }}
      >
        <Container maxWidth="sm">
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ mb: 3 }}
          >
            <IconButton
              onClick={() => navigate("/clients")}
              sx={{ color: "white", marginLeft: "8px" }}
            >
              <ArrowBack />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: "white" }}>
                {client.name}
              </Typography>
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ mt: 0.5 }}
              >
                <Phone sx={{ fontSize: 16, opacity: 0.9, marginLeft: "8px" }} />
                <Typography
                  variant="caption"
                  sx={{ color: "white", opacity: 0.95 }}
                >
                  {client.phone}
                </Typography>
              </Stack>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <IconButton
                onClick={() => setEditClientDialogOpen(true)}
                sx={{
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.15)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                }}
                size="small"
              >
                <Edit fontSize="small" />
              </IconButton>
              <IconButton
                onClick={() => {
                  if (window.confirm("هل أنت متأكد من حذف هذا العميل؟")) {
                    deleteClient(client.id);
                    navigate("/clients");
                  }
                }}
                sx={{
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.15)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                }}
                size="small"
              >
                <Delete fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          {/* Summary Cards */}
          <Grid container spacing={2.5}>
            <Grid item xs={3}>
              <Card
                sx={{
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "none",
                }}
              >
                <CardContent sx={{ p: 2.5, textAlign: "center" }}>
                  <TrendingDown sx={{ fontSize: 18, mb: 0.5, opacity: 0.9 }} />
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.9, display: "block", fontSize: "0.6rem" }}
                  >
                    المصروفات
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    sx={{ mt: 0.5, fontSize: "0.85rem" }}
                  >
                    {formatCurrency(summary.totalExpenses)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={3}>
              <Card
                sx={{
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "none",
                }}
              >
                <CardContent sx={{ p: 2.5, textAlign: "center" }}>
                  <CreditCard sx={{ fontSize: 18, mb: 0.5, opacity: 0.9 }} />
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.9, display: "block", fontSize: "0.6rem" }}
                  >
                    الديون
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    sx={{ mt: 0.5, fontSize: "0.85rem" }}
                  >
                    {formatCurrency(summary.totalDebts)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={3}>
              <Card
                sx={{
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "none",
                }}
              >
                <CardContent sx={{ p: 2.5, textAlign: "center" }}>
                  <CheckCircle sx={{ fontSize: 18, mb: 0.5, opacity: 0.9 }} />
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.9, display: "block", fontSize: "0.6rem" }}
                  >
                    المدفوع
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    sx={{ mt: 0.5, fontSize: "0.85rem" }}
                  >
                    {formatCurrency(summary.totalPaid)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={3}>
              <Card
                sx={{
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: "none",
                }}
              >
                <CardContent sx={{ p: 2.5, textAlign: "center" }}>
                  <AccountBalance
                    sx={{ fontSize: 18, mb: 0.5, opacity: 0.9 }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.9, display: "block", fontSize: "0.6rem" }}
                  >
                    المتبقي
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    sx={{ mt: 0.5, fontSize: "0.85rem" }}
                  >
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
        {/* Menu Section */}
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ mb: 4, px: 0.5, mt: 5 }}
        >
          القوائم السريعة
        </Typography>

        <Stack spacing={3.5} sx={{ mb: 5 }}>
          {menuItems.map((item, index) => (
            <Card
              key={index}
              onClick={item.onClick}
              sx={{
                borderRadius: 3,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                cursor: "pointer",
                transition: "all 0.2s",
                border:
                  theme.palette.mode === "dark"
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "none",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                },
                "&:active": {
                  transform: "scale(0.98)",
                },
              }}
            >
              <CardContent sx={{ p: 3.5 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={2}
                >
                  <Stack direction="row" alignItems="center" spacing={0}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2.5,
                        bgcolor: item.bgColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginLeft: "24px",
                      }}
                    >
                      <item.icon sx={{ fontSize: 28, color: item.color }} />
                    </Box>
                    <Box>
                      <Typography
                        variant="body1"
                        fontWeight={700}
                        sx={{ mb: 0.5 }}
                      >
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        اضغط للدخول
                      </Typography>
                    </Box>
                  </Stack>
                  <Box sx={{ flexShrink: 0 }}>
                    <ChevronLeft
                      sx={{ color: "text.secondary", fontSize: 28 }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {/* Profits Section */}
        <Box ref={profitsRef} sx={{ mb: 5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 3, px: 0.5 }}>
            حساب الأرباح
          </Typography>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    إجمالي المدفوعات
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    color="success.main"
                  >
                    {formatCurrency(summary.totalPaid)}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    إجمالي المصروفات
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="error.main">
                    {formatCurrency(summary.totalExpenses)}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    صافي الأرباح
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={900}
                    color={
                      summary.totalPaid - summary.totalExpenses >= 0
                        ? "success.main"
                        : "error.main"
                    }
                  >
                    {formatCurrency(summary.totalPaid - summary.totalExpenses)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Container>

      {/* Expenses List Dialog */}
      <Dialog
        open={expensesListDialogOpen}
        onClose={() => setExpensesListDialogOpen(false)}
        fullScreen
        sx={{
          "& .MuiDialog-paper": {
            bgcolor: theme.palette.mode === "dark" ? "#0f172a" : "#f8fafc",
          },
        }}
      >
        <Box
          sx={{
            background:
              theme.palette.mode === "light"
                ? "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)"
                : "linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)",
            color: "white",
            p: 2,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton
                onClick={() => setExpensesListDialogOpen(false)}
                sx={{ color: "white" }}
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="h5" fontWeight={800} sx={{ flexGrow: 1 }}>
                المصروفات ({clientExpenses.length})
              </Typography>
            </Stack>
            <Button
              variant="contained"
              onClick={() => {
                setEditingExpense(null);
                resetExpense({
                  description: "",
                  amount: "" as any,
                  category: "مواد",
                  date: dayjs().format("YYYY-MM-DD"),
                  notes: "",
                });
                setExpenseDialogOpen(true);
              }}
              sx={{
                bgcolor: "white",
                color: "primary.main",
                fontWeight: 700,
                "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
                borderRadius: 2,
              }}
              startIcon={<Add />}
            >
              جديدة
            </Button>
          </Stack>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", pb: 2 }}>
          {clientExpenses.length === 0 ? (
            <Container maxWidth="sm" sx={{ mt: -2 }}>
              <Card
                sx={{
                  borderRadius: 2.5,
                  textAlign: "center",
                  py: 6,
                  bgcolor: "background.paper",
                }}
              >
                <TrendingDown
                  sx={{
                    fontSize: 60,
                    color: "text.secondary",
                    opacity: 0.3,
                    mb: 2,
                  }}
                />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  لا توجد مصروفات
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Add />}
                  onClick={() => {
                    setEditingExpense(null);
                    resetExpense({
                      description: "",
                      amount: "" as any,
                      category: "مواد",
                      date: dayjs().format("YYYY-MM-DD"),
                      notes: "",
                    });
                    setExpenseDialogOpen(true);
                  }}
                  sx={{ mt: 2, borderRadius: 2 }}
                >
                  إضافة أول مصروف
                </Button>
              </Card>
            </Container>
          ) : (
            <Container maxWidth="sm" sx={{ mt: 2 }}>
              <Stack spacing={2.5}>
                {clientExpenses.map((expense) => (
                  <Card
                    key={expense.id}
                    sx={{
                      borderRadius: 2.5,
                      boxShadow:
                        theme.palette.mode === "light"
                          ? "0 2px 8px rgba(0,0,0,0.06)"
                          : "0 2px 8px rgba(0,0,0,0.3)",
                      bgcolor: "background.paper",
                      border:
                        theme.palette.mode === "dark"
                          ? "1px solid rgba(255,255,255,0.1)"
                          : "none",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CardContent
                      sx={{ p: 2.5 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Stack
                        direction="row"
                        alignItems="flex-start"
                        spacing={0}
                      >
                        <Avatar
                          sx={{
                            bgcolor: "error.light",
                            width: 48,
                            height: 48,
                            flexShrink: 0,
                            marginLeft: "24px",
                          }}
                        >
                          <TrendingDown
                            sx={{ color: "error.main", fontSize: 20 }}
                          />
                        </Avatar>

                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                            sx={{ mb: 1 }}
                          >
                            <Typography variant="body2" fontWeight={700} noWrap>
                              {expense.description}
                            </Typography>
                            <Chip
                              label={expense.category}
                              size="small"
                              color="error"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.65rem" }}
                            />
                          </Stack>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mb: 1 }}
                          >
                            {dayjs(expense.date).format("DD/MM/YYYY")}
                          </Typography>

                          {expense.notes && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mb: 1,
                                fontStyle: "italic",
                                lineHeight: 1.6,
                                px: 1,
                                py: 0.5,
                                bgcolor:
                                  theme.palette.mode === "dark"
                                    ? "rgba(255,255,255,0.05)"
                                    : "rgba(0,0,0,0.03)",
                                borderRadius: 1,
                                borderRight: `2px solid ${theme.palette.primary.main}`,
                              }}
                            >
                              💬 {expense.notes}
                            </Typography>
                          )}

                          <Typography
                            variant="h6"
                            fontWeight={800}
                            color="error.main"
                          >
                            {formatCurrency(expense.amount)}
                          </Typography>
                        </Box>

                        <Stack
                          direction="row"
                          spacing={2}
                          sx={{ marginLeft: "8px" }}
                        >
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditExpense(expense);
                              setExpensesListDialogOpen(false);
                            }}
                            sx={{
                              bgcolor: "primary.main",
                              color: "white",
                              width: 32,
                              height: 32,
                              "&:hover": { bgcolor: "primary.dark" },
                            }}
                          >
                            <Edit sx={{ fontSize: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteExpense(expense.id);
                            }}
                            sx={{
                              bgcolor: "error.main",
                              color: "white",
                              width: 32,
                              height: 32,
                              "&:hover": { bgcolor: "error.dark" },
                            }}
                          >
                            <Delete sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}

                {/* Total Summary */}
                <Card
                  sx={{
                    borderRadius: 2.5,
                    bgcolor: "background.paper",
                    border:
                      theme.palette.mode === "dark"
                        ? "1px solid rgba(255,255,255,0.1)"
                        : "1px solid rgba(0,0,0,0.12)",
                    boxShadow:
                      theme.palette.mode === "light"
                        ? "0 2px 8px rgba(0,0,0,0.06)"
                        : "0 2px 8px rgba(0,0,0,0.3)",
                    mt: 2,
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1.5 }}
                    >
                      <Typography
                        variant="h6"
                        fontWeight={900}
                        color="text.primary"
                      >
                        المجموع الكلي
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight={900}
                        color="text.primary"
                      >
                        {formatCurrency(summary.totalExpenses)}
                      </Typography>
                    </Stack>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      startIcon={<PictureAsPdf />}
                      onClick={() => {
                        if (!client) return;
                        const printWindow = window.open("", "_blank");
                        if (!printWindow) {
                          alert(
                            "يرجى السماح بفتح النوافذ المنبثقة لطباعة المصروفات"
                          );
                          return;
                        }
                        const htmlContent = `
                          <!DOCTYPE html>
                          <html lang="ar" dir="rtl">
                          <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>مصروفات ${client.name}</title>
                            <style>
                              * { margin: 0; padding: 0; box-sizing: border-box; }
                              @page { size: A4; margin: 15mm; }
                              body {
                                font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
                                line-height: 1.6;
                                color: #333;
                                background: white;
                                padding: 20px;
                              }
                              .header {
                                text-align: center;
                                border-bottom: 3px solid #ef4444;
                                padding-bottom: 15px;
                                margin-bottom: 20px;
                              }
                              .header h1 {
                                font-size: 24px;
                                font-weight: bold;
                                color: #ef4444;
                                margin-bottom: 5px;
                              }
                              .client-info {
                                background: #f5f5f5;
                                padding: 15px;
                                border-radius: 8px;
                                margin-bottom: 20px;
                              }
                              .client-info h3 {
                                font-size: 16px;
                                color: #333;
                                margin-bottom: 8px;
                              }
                              table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-bottom: 20px;
                                font-size: 12px;
                              }
                              thead {
                                background: #ef4444;
                                color: white;
                              }
                              th, td {
                                padding: 12px;
                                text-align: right;
                                border-bottom: 1px solid #ddd;
                              }
                              tbody tr:hover { background: #f9fafb; }
                              .total {
                                background: #fee2e2;
                                padding: 15px;
                                border-radius: 8px;
                                text-align: center;
                                border: 2px solid #ef4444;
                              }
                              .total h3 {
                                font-size: 20px;
                                font-weight: bold;
                                color: #ef4444;
                              }
                              @media print {
                                body { padding: 0; }
                              }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>كشف المصروفات</h1>
                              <p>${dayjs().format("DD MMMM YYYY")}</p>
                            </div>
                            <div class="client-info">
                              <h3>العميل: ${client.name}</h3>
                              <p>📱 ${client.phone}</p>
                            </div>
                            <table>
                              <thead>
                                <tr>
                                  <th>التاريخ</th>
                                  <th>الوصف</th>
                                  <th>الفئة</th>
                                  <th>المبلغ</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${clientExpenses
                                  .map(
                                    (exp) => `
                                  <tr>
                                    <td>${dayjs(exp.date).format(
                                      "DD/MM/YYYY"
                                    )}</td>
                                    <td>${exp.description}</td>
                                    <td>${exp.category}</td>
                                    <td><strong>${formatCurrency(
                                      exp.amount
                                    )}</strong></td>
                                  </tr>
                                `
                                  )
                                  .join("")}
                              </tbody>
                            </table>
                            <div class="total">
                              <h3>المجموع الكلي: ${formatCurrency(
                                summary.totalExpenses
                              )}</h3>
                            </div>
                          </body>
                          </html>
                        `;
                        printWindow.document.write(htmlContent);
                        printWindow.document.close();
                        setTimeout(() => {
                          printWindow.print();
                        }, 250);
                      }}
                      sx={{ borderRadius: 2, py: 1.5, fontWeight: 700 }}
                    >
                      مشاركة كملف PDF
                    </Button>
                  </CardContent>
                </Card>
              </Stack>
            </Container>
          )}
        </Box>
      </Dialog>

      {/* Payments List Dialog */}
      <Dialog
        open={paymentsListDialogOpen}
        onClose={() => setPaymentsListDialogOpen(false)}
        fullScreen
        sx={{
          "& .MuiDialog-paper": {
            bgcolor: theme.palette.mode === "dark" ? "#0f172a" : "#f8fafc",
          },
        }}
      >
        <Box
          sx={{
            background:
              theme.palette.mode === "light"
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
            color: "white",
            p: 2,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton
                onClick={() => setPaymentsListDialogOpen(false)}
                sx={{ color: "white" }}
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="h5" fontWeight={800} sx={{ flexGrow: 1 }}>
                المدفوعات ({clientPayments.length})
              </Typography>
            </Stack>
            <Button
              variant="contained"
              onClick={() => {
                setEditingPayment(null);
                resetPayment({
                  amount: "" as any,
                  paymentMethod: "cash",
                  paymentDate: dayjs().format("YYYY-MM-DD"),
                  invoiceId: "",
                  notes: "",
                });
                setPaymentDialogOpen(true);
              }}
              sx={{
                bgcolor: "white",
                color: "success.main",
                fontWeight: 700,
                "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
                borderRadius: 2,
              }}
              startIcon={<Add />}
            >
              جديدة
            </Button>
          </Stack>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", pb: 2 }}>
          {clientPayments.length === 0 ? (
            <Container maxWidth="sm" sx={{ mt: -2 }}>
              <Card
                sx={{
                  borderRadius: 2.5,
                  textAlign: "center",
                  py: 6,
                  bgcolor: "background.paper",
                }}
              >
                <Payment
                  sx={{
                    fontSize: 60,
                    color: "text.secondary",
                    opacity: 0.3,
                    mb: 2,
                  }}
                />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  لا توجد مدفوعات
                </Typography>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Add />}
                  onClick={() => {
                    setEditingPayment(null);
                    resetPayment({
                      amount: "" as any,
                      paymentMethod: "cash",
                      paymentDate: dayjs().format("YYYY-MM-DD"),
                      invoiceId: "",
                      notes: "",
                    });
                    setPaymentDialogOpen(true);
                  }}
                  sx={{ mt: 2, borderRadius: 2 }}
                >
                  إضافة أول دفعة
                </Button>
              </Card>
            </Container>
          ) : (
            <Container maxWidth="sm" sx={{ mt: 2 }}>
              <Stack spacing={2.5}>
                {clientPayments.map((payment) => (
                  <Card
                    key={payment.id}
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      borderRadius: 2.5,
                      boxShadow:
                        theme.palette.mode === "light"
                          ? "0 2px 8px rgba(0,0,0,0.06)"
                          : "0 2px 8px rgba(0,0,0,0.3)",
                      bgcolor: "background.paper",
                      border:
                        theme.palette.mode === "dark"
                          ? "1px solid rgba(255,255,255,0.1)"
                          : "none",
                    }}
                  >
                    <CardContent
                      sx={{ p: 2.5 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Stack
                        direction="row"
                        alignItems="flex-start"
                        spacing={0}
                      >
                        <Avatar
                          sx={{
                            bgcolor: "success.light",
                            width: 48,
                            height: 48,
                            flexShrink: 0,
                            marginLeft: "24px",
                          }}
                        >
                          <Payment
                            sx={{ color: "success.main", fontSize: 20 }}
                          />
                        </Avatar>

                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                            sx={{ mb: 1 }}
                          >
                            <Typography variant="body2" fontWeight={700} noWrap>
                              {getPaymentMethodLabel(payment.paymentMethod)}
                            </Typography>
                          </Stack>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mb: 1 }}
                          >
                            {dayjs(payment.paymentDate).format("DD/MM/YYYY")}
                          </Typography>

                          {payment.notes && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mb: 1,
                                fontStyle: "italic",
                                lineHeight: 1.6,
                                px: 1,
                                py: 0.5,
                                bgcolor:
                                  theme.palette.mode === "dark"
                                    ? "rgba(255,255,255,0.05)"
                                    : "rgba(0,0,0,0.03)",
                                borderRadius: 1,
                                borderRight: `2px solid ${theme.palette.success.main}`,
                              }}
                            >
                              💬 {payment.notes}
                            </Typography>
                          )}

                          <Typography
                            variant="h6"
                            fontWeight={800}
                            color="success.main"
                          >
                            {formatCurrency(payment.amount)}
                          </Typography>
                        </Box>

                        <Stack
                          direction="row"
                          spacing={2}
                          sx={{ marginLeft: "8px" }}
                        >
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditPayment(payment);
                              setPaymentsListDialogOpen(false);
                            }}
                            sx={{
                              bgcolor: "primary.main",
                              color: "white",
                              width: 32,
                              height: 32,
                              "&:hover": { bgcolor: "primary.dark" },
                            }}
                          >
                            <Edit sx={{ fontSize: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeletePayment(payment.id);
                            }}
                            sx={{
                              bgcolor: "error.main",
                              color: "white",
                              width: 32,
                              height: 32,
                              "&:hover": { bgcolor: "error.dark" },
                            }}
                          >
                            <Delete sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}

                {/* Total Summary */}
                <Card
                  sx={{
                    borderRadius: 2.5,
                    bgcolor: "background.paper",
                    border:
                      theme.palette.mode === "dark"
                        ? "1px solid rgba(255,255,255,0.1)"
                        : "1px solid rgba(0,0,0,0.12)",
                    boxShadow:
                      theme.palette.mode === "light"
                        ? "0 2px 8px rgba(0,0,0,0.06)"
                        : "0 2px 8px rgba(0,0,0,0.3)",
                    mt: 2,
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1.5 }}
                    >
                      <Typography
                        variant="h6"
                        fontWeight={900}
                        color="text.primary"
                      >
                        المجموع الكلي
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight={900}
                        color="success.main"
                      >
                        {formatCurrency(
                          clientPayments.reduce((sum, p) => sum + p.amount, 0)
                        )}
                      </Typography>
                    </Stack>
                    <Button
                      variant="contained"
                      color="success"
                      fullWidth
                      startIcon={<PictureAsPdf />}
                      onClick={() => {
                        if (!client) return;
                        const printWindow = window.open("", "_blank");
                        if (!printWindow) return;

                        const totalPayments = clientPayments.reduce(
                          (sum, p) => sum + p.amount,
                          0
                        );

                        const htmlContent = `
                        <!DOCTYPE html>
                        <html dir="rtl" lang="ar">
                          <head>
                            <meta charset="UTF-8">
                            <title>كشف المدفوعات</title>
                            <style>
                              * { margin: 0; padding: 0; box-sizing: border-box; }
                              body {
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                padding: 20px;
                                background: #fff;
                                color: #333;
                              }
                              .header {
                                text-align: center;
                                margin-bottom: 30px;
                                padding-bottom: 20px;
                                border-bottom: 2px solid #10b981;
                              }
                              .header h1 {
                                font-size: 24px;
                                color: #10b981;
                                margin-bottom: 10px;
                              }
                              .client-info {
                                background: #f0fdf4;
                                padding: 15px;
                                border-radius: 8px;
                                margin-bottom: 20px;
                                border-right: 4px solid #10b981;
                              }
                              .client-info h3 {
                                font-size: 16px;
                                color: #333;
                                margin-bottom: 8px;
                              }
                              table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-bottom: 20px;
                                font-size: 12px;
                              }
                              thead {
                                background: #10b981;
                                color: white;
                              }
                              th, td {
                                padding: 12px;
                                text-align: right;
                                border-bottom: 1px solid #ddd;
                              }
                              tbody tr:hover { background: #f9fafb; }
                              .total {
                                background: #d1fae5;
                                padding: 15px;
                                border-radius: 8px;
                                text-align: center;
                                border: 2px solid #10b981;
                              }
                              .total h3 {
                                font-size: 20px;
                                font-weight: bold;
                                color: #059669;
                              }
                              @media print {
                                body { padding: 0; }
                              }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>كشف المدفوعات</h1>
                              <p>${dayjs().format("DD MMMM YYYY")}</p>
                            </div>
                            <div class="client-info">
                              <h3>العميل: ${client.name}</h3>
                              <p>📱 ${client.phone}</p>
                            </div>
                            <table>
                              <thead>
                                <tr>
                                  <th>التاريخ</th>
                                  <th>طريقة الدفع</th>
                                  <th>المبلغ</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${clientPayments
                                  .map(
                                    (payment) => `
                                  <tr>
                                    <td>${dayjs(payment.paymentDate).format(
                                      "DD/MM/YYYY"
                                    )}</td>
                                    <td>${getPaymentMethodLabel(
                                      payment.paymentMethod
                                    )}</td>
                                    <td><strong>${formatCurrency(
                                      payment.amount
                                    )}</strong></td>
                                  </tr>
                                `
                                  )
                                  .join("")}
                              </tbody>
                            </table>
                            <div class="total">
                              <h3>المجموع الكلي: ${formatCurrency(
                                totalPayments
                              )}</h3>
                            </div>
                          </body>
                          </html>
                        `;
                        printWindow.document.write(htmlContent);
                        printWindow.document.close();
                        setTimeout(() => {
                          printWindow.print();
                        }, 250);
                      }}
                      sx={{ borderRadius: 2, py: 1.5, fontWeight: 700 }}
                    >
                      مشاركة كملف PDF
                    </Button>
                  </CardContent>
                </Card>
              </Stack>
            </Container>
          )}
        </Box>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog
        open={expenseDialogOpen}
        onClose={() => {
          setExpenseDialogOpen(false);
          setEditingExpense(null);
        }}
        fullScreen
      >
        <form onSubmit={handleExpenseSubmit(onSubmitExpense)}>
          <Box
            sx={{
              background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
              color: "white",
              p: 2,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton
                onClick={() => {
                  setExpenseDialogOpen(false);
                  setEditingExpense(null);
                }}
                sx={{ color: "white" }}
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                {editingExpense ? "تعديل مصروف" : "إضافة مصروف"}
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ p: 3.5 }}>
            <Stack spacing={3.5}>
              <Controller
                name="description"
                control={expenseControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="الوصف"
                    placeholder="مثال: شراء إسمنت"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
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
                    placeholder="أدخل المبلغ"
                    value={
                      field.value === 0 || field.value === "" ? "" : field.value
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? "" : value);
                    }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />

              <Controller
                name="category"
                control={expenseControl}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>الفئة</InputLabel>
                    <Select {...field} label="الفئة" sx={{ borderRadius: 2 }}>
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
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />

              <Controller
                name="notes"
                control={expenseControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="ملاحظات"
                    multiline
                    rows={3}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
              <Button
                onClick={() => {
                  setExpenseDialogOpen(false);
                  setEditingExpense(null);
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
                color="primary"
                fullWidth
                size="large"
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                {editingExpense ? "حفظ" : "إضافة"}
              </Button>
            </Stack>
          </Box>
        </form>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => {
          setPaymentDialogOpen(false);
          setEditingPayment(null);
        }}
        fullScreen
      >
        <form onSubmit={handlePaymentSubmit(onSubmitPayment)}>
          <Box
            sx={{
              background:
                theme.palette.mode === "light"
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
              color: "white",
              p: 2,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton
                onClick={() => {
                  setPaymentDialogOpen(false);
                  setEditingPayment(null);
                }}
                sx={{ color: "white" }}
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                {editingPayment ? "تعديل دفعة" : "إضافة دفعة جديدة"}
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ p: 3.5 }}>
            <Stack spacing={3.5}>
              <Controller
                name="invoiceId"
                control={paymentControl}
                render={({ field }) => {
                  const clientInvoices = invoices.filter(
                    (inv) => inv.clientId === clientId && inv.status !== "paid"
                  );

                  return (
                    <FormControl fullWidth>
                      <InputLabel>الفاتورة (اختياري)</InputLabel>
                      <Select
                        {...field}
                        value={field.value || ""}
                        label="الفاتورة (اختياري)"
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="">بدون فاتورة</MenuItem>
                        {clientInvoices.map((invoice) => (
                          <MenuItem key={invoice.id} value={invoice.id}>
                            {invoice.invoiceNumber} -{" "}
                            {formatCurrency(invoice.total)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  );
                }}
              />

              <Controller
                name="amount"
                control={paymentControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="المبلغ"
                    type="number"
                    placeholder="أدخل المبلغ"
                    value={
                      field.value === 0 || field.value === "" ? "" : field.value
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? "" : value);
                    }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />

              <Controller
                name="paymentMethod"
                control={paymentControl}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>طريقة الدفع</InputLabel>
                    <Select
                      {...field}
                      label="طريقة الدفع"
                      sx={{ borderRadius: 2 }}
                    >
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
                control={paymentControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="تاريخ الدفع"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />

              <Controller
                name="notes"
                control={paymentControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="ملاحظات"
                    multiline
                    rows={3}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
              <Button
                onClick={() => {
                  setPaymentDialogOpen(false);
                  setEditingPayment(null);
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
                color="success"
                fullWidth
                size="large"
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                {editingPayment ? "حفظ" : "إضافة"}
              </Button>
            </Stack>
          </Box>
        </form>
      </Dialog>

      {/* Snackbar for success message */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
