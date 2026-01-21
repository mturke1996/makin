import React, { useState, useMemo, useEffect } from "react";
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
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Snackbar,
  InputAdornment,
  Alert,
} from "@mui/material";
import {
  ArrowBack,
  Payment,
  Business,
  Person,
  Store,
  ChevronLeft,
  Phone,
  Add,
  TrendingDown,
  TrendingUp,
  Edit,
  Delete,
  CreditCard,
  PictureAsPdf,
  Search,
  Assessment,
} from "@mui/icons-material";
import { useDataStore } from "@/store/useDataStore";
import { useForm, Controller } from "react-hook-form";
import { formatCurrency } from "@/utils/calculations";
import { generateFinalReportPDF } from "@/utils/pdfGenerator";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import type {
  Payment as PaymentType,
  Expense,
  StandaloneDebt,
  DebtParty,
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
    invoices,
    debtParties,
    addPayment,
    updatePayment,
    deletePayment,
    addExpense,
    updateExpense,
    deleteExpense,
    addStandaloneDebt,
    updateStandaloneDebt,
    deleteStandaloneDebt,
    addDebtParty,
    updateDebtParty,
    updateClient,
  } = useDataStore();

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
      onClick: () => setDebtsListDialogOpen(true),
    },
    {
      title: "حساب الأرباح",
      icon: TrendingUp,
      color: "#8b5cf6",
      bgColor:
        theme.palette.mode === "dark" ? "rgba(139, 92, 246, 0.2)" : "#ede9fe",
      onClick: () => setProfitDialogOpen(true),
    },
  ];
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [debtDialogOpen, setDebtDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingDebt, setEditingDebt] = useState<StandaloneDebt | null>(null);
  const [expensesListDialogOpen, setExpensesListDialogOpen] = useState(false);
  const [paymentsListDialogOpen, setPaymentsListDialogOpen] = useState(false);
  const [debtsListDialogOpen, setDebtsListDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentType | null>(
    null
  );
  const [payDebtDialogOpen, setPayDebtDialogOpen] = useState(false);
  const [selectedDebtForPay, setSelectedDebtForPay] =
    useState<StandaloneDebt | null>(null);
  const [payDebtAmount, setPayDebtAmount] = useState<string>("");
  const [partyProfileDialogOpen, setPartyProfileDialogOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<DebtParty | null>(null);
  const [partyDialogOpen, setPartyDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<DebtParty | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [profitDialogOpen, setProfitDialogOpen] = useState(false);
  const [profitPercentage, setProfitPercentage] = useState<string>("");
  const [expensesSearchQuery, setExpensesSearchQuery] = useState("");
  const [paymentsSearchQuery, setPaymentsSearchQuery] = useState("");
  const [debtsSearchQuery, setDebtsSearchQuery] = useState("");
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
      name: client?.name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      address: client?.address || "",
      type: client?.type || "individual",
    },
  });

  // Update form when client changes
  useEffect(() => {
    if (client && editClientDialogOpen) {
      resetClient({
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        type: client.type,
      });
    }
  }, [client, editClientDialogOpen, resetClient]);

  const onSubmitClient = async (data: ClientFormData) => {
    if (!clientId) return;
    try {
      await updateClient(clientId, data);
      setSnackbarMessage("تم تحديث بيانات العميل بنجاح");
      setSnackbarOpen(true);
      setEditClientDialogOpen(false);
    } catch (error: any) {
      setSnackbarMessage(error?.message || "حدث خطأ أثناء التحديث");
      setSnackbarOpen(true);
    }
  };

  // Payment Form
  const {
    control: paymentControl,
    handleSubmit: handlePaymentSubmit,
    reset: resetPayment,
    setValue: setPaymentValue,
  } = useForm<{
    amount: string | number;
    paymentMethod: "cash" | "check" | "bank_transfer" | "credit_card";
    paymentDate: string;
    invoiceId: string;
    notes: string;
  }>({
    defaultValues: {
      amount: "" as any,
      paymentMethod: "cash",
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
      partyType: "person" as "person" | "shop" | "company",
      partyName: "",
      description: "",
      amount: "" as any,
      date: dayjs().format("YYYY-MM-DD"),
      notes: "",
    },
  });

  // Party Form
  const {
    control: partyControl,
    handleSubmit: handlePartySubmit,
    reset: resetParty,
    setValue: setPartyValue,
  } = useForm({
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      type: "person" as "person" | "shop" | "company",
    },
  });

  // Update party form when editing
  useEffect(() => {
    if (editingParty) {
      setPartyValue("name", editingParty.name);
      setPartyValue("phone", editingParty.phone);
      setPartyValue("address", editingParty.address);
      setPartyValue("type", editingParty.type);
    } else {
      resetParty({
        name: "",
        phone: "",
        address: "",
        type: "person",
      });
    }
  }, [editingParty, setPartyValue, resetParty]);

  // Load profit percentage for this client from database
  useEffect(() => {
    if (!client) {
      setProfitPercentage("");
      return;
    }
    const percentage = client.profitPercentage;
    if (percentage !== undefined && percentage !== null) {
      setProfitPercentage(percentage.toString());
    } else {
      setProfitPercentage("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id, client?.profitPercentage]);

  // Handle save profit percentage for this client
  const handleSaveProfitPercentage = async () => {
    if (!clientId || !client) return;

    const percentage = parseFloat(profitPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      setSnackbarMessage("النسبة يجب أن تكون بين 0 و 100");
      setSnackbarOpen(true);
      return;
    }

    try {
      // Save to database
      await updateClient(clientId, {
        profitPercentage: percentage,
      });

      // Dispatch custom event to update HomePage
      window.dispatchEvent(new Event("profitPercentageUpdated"));
      setSnackbarMessage("تم حفظ النسبة بنجاح");
      setSnackbarOpen(true);
      setProfitDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving profit percentage:", error);
      setSnackbarMessage(error?.message || "حدث خطأ أثناء حفظ النسبة");
      setSnackbarOpen(true);
    }
  };

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

  // Filtered data for search
  const filteredExpenses = useMemo(() => {
    if (!expensesSearchQuery) return clientExpenses;
    const query = expensesSearchQuery.toLowerCase();
    return clientExpenses.filter(
      (exp) =>
        exp.description.toLowerCase().includes(query) ||
        exp.category.toLowerCase().includes(query) ||
        exp.notes?.toLowerCase().includes(query) ||
        formatCurrency(exp.amount).includes(query)
    );
  }, [clientExpenses, expensesSearchQuery]);

  const filteredPayments = useMemo(() => {
    if (!paymentsSearchQuery) return clientPayments;
    const query = paymentsSearchQuery.toLowerCase();
    return clientPayments.filter(
      (pay) =>
        formatCurrency(pay.amount).includes(query) ||
        pay.paymentMethod.toLowerCase().includes(query) ||
        pay.notes?.toLowerCase().includes(query) ||
        dayjs(pay.paymentDate).format("DD/MM/YYYY").includes(query)
    );
  }, [clientPayments, paymentsSearchQuery]);

  // Get debt parties for this client
  const clientDebtParties = useMemo(() => {
    return debtParties.filter((p) => p.clientId === clientId);
  }, [debtParties, clientId]);

  // Group debts by party (using debt parties)
  const parties = useMemo(() => {
    return clientDebtParties
      .map((party) => {
        const partyDebts = clientDebts.filter(
          (d) =>
            (d as any).partyId === party.id ||
            ((d as any).partyName === party.name &&
              (d as any).partyType === party.type)
        );
        const totalAmount = partyDebts.reduce((sum, d) => sum + d.amount, 0);
        const totalPaid = partyDebts.reduce((sum, d) => sum + d.paidAmount, 0);
        const totalRemaining = partyDebts.reduce(
          (sum, d) => sum + d.remainingAmount,
          0
        );
        return {
          ...party,
          debts: partyDebts,
          totalAmount,
          totalPaid,
          totalRemaining,
        };
      })
      .sort((a, b) => dayjs(b.createdAt || "").diff(dayjs(a.createdAt || "")));
  }, [clientDebtParties, clientDebts]);

  // Filtered parties based on search
  const filteredParties = useMemo(() => {
    if (!debtsSearchQuery) return parties;
    const query = debtsSearchQuery.toLowerCase();
    return parties.filter(
      (party) =>
        party.name.toLowerCase().includes(query) ||
        party.phone?.toLowerCase().includes(query) ||
        party.address?.toLowerCase().includes(query) ||
        party.debts.some(
          (debt) =>
            debt.description?.toLowerCase().includes(query) ||
            formatCurrency(debt.amount).includes(query) ||
            formatCurrency(debt.remainingAmount).includes(query)
        )
    );
  }, [parties, debtsSearchQuery]);

  // Get debts for selected party
  const partyDebts = useMemo(() => {
    if (!selectedParty) return [];
    return clientDebts.filter(
      (debt) =>
        (debt as any).partyId === selectedParty.id ||
        ((debt as any).partyName === selectedParty.name &&
          (debt as any).partyType === selectedParty.type)
    );
  }, [clientDebts, selectedParty]);

  const partyStats = useMemo(() => {
    const totalAmount = partyDebts.reduce((sum, d) => sum + d.amount, 0);
    const totalPaid = partyDebts.reduce((sum, d) => sum + d.paidAmount, 0);
    const totalRemaining = partyDebts.reduce(
      (sum, d) => sum + d.remainingAmount,
      0
    );
    return { totalAmount, totalPaid, totalRemaining };
  }, [partyDebts]);

  const summary = useMemo(() => {
    const totalExpenses = clientExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );
    const totalDebts = clientDebts.reduce(
      (sum, debt) => sum + (debt.remainingAmount || 0),
      0
    );
    const totalPaid = clientPayments.reduce((sum, pay) => sum + pay.amount, 0);

    // المتبقي = المدفوع - المصروفات
    const remaining = totalPaid - totalExpenses;

    // نسبة الربح
    const profitPercentage = client?.profitPercentage || 0;
    const profit =
      totalExpenses > 0 && profitPercentage > 0
        ? (totalExpenses * profitPercentage) / 100
        : 0;

    return {
      totalExpenses,
      totalDebts,
      totalPaid,
      remaining,
      profit,
      profitPercentage,
      expenseCount: clientExpenses.length,
      debtCount: clientDebts.length,
      paymentCount: clientPayments.length,
    };
  }, [clientExpenses, clientDebts, clientPayments, client]);

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
    setDebtValue("partyType", debt.partyType || "person");
    setDebtValue("partyName", debt.partyName || "");
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
        setSnackbarMessage("تم الحذف بنجاح");
        setSnackbarOpen(true);
      } catch (error: any) {
        console.error("Error deleting debt:", error);
        const errorMessage =
          error?.message || error?.toString() || "حدث خطأ أثناء الحذف";
        setSnackbarMessage(errorMessage);
        setSnackbarOpen(true);
      }
    }
  };

  const handleOpenPayDebtDialog = (debt: StandaloneDebt) => {
    setSelectedDebtForPay(debt);
    setPayDebtAmount("");
    setPayDebtDialogOpen(true);
  };

  const handleOpenPartyProfile = (party: DebtParty) => {
    setSelectedParty(party);
    setPartyProfileDialogOpen(true);
  };

  const handleAddParty = () => {
    setEditingParty(null);
    setPartyDialogOpen(true);
  };

  const onSubmitParty = async (data: {
    name: string;
    phone: string;
    address: string;
    type: "person" | "shop" | "company";
  }) => {
    try {
      if (editingParty) {
        await updateDebtParty(editingParty.id, {
          name: data.name,
          phone: data.phone,
          address: data.address,
          type: data.type,
        });
        setSnackbarMessage("تم التحديث بنجاح");
      } else {
        await addDebtParty({
          id: crypto.randomUUID(),
          clientId: clientId!,
          name: data.name,
          phone: data.phone,
          address: data.address,
          type: data.type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setSnackbarMessage("تم الإضافة بنجاح");
      }
      setPartyDialogOpen(false);
      setEditingParty(null);
      setSnackbarOpen(true);
    } catch (error: any) {
      console.error("Error saving party:", error);
      setSnackbarMessage(error?.message || "حدث خطأ أثناء الحفظ");
      setSnackbarOpen(true);
    }
  };

  const handlePayDebt = async () => {
    if (!selectedDebtForPay) return;
    const pay = parseFloat(payDebtAmount) || 0;

    // Get the latest debt data from clientDebts to ensure we have current values
    const currentDebt = clientDebts.find((d) => d.id === selectedDebtForPay.id);
    if (!currentDebt && !selectedDebtForPay.id.startsWith("party_")) {
      setSnackbarMessage("الدين غير موجود");
      setSnackbarOpen(true);
      return;
    }

    const debtToPay = currentDebt || selectedDebtForPay;
    const maxPayable = debtToPay.remainingAmount;

    if (pay <= 0 || pay > maxPayable) {
      setSnackbarMessage(
        `المبلغ غير صحيح. الحد الأقصى: ${formatCurrency(maxPayable)}`
      );
      setSnackbarOpen(true);
      return;
    }

    try {
      // Check if this is a party-level payment (virtual debt)
      if (selectedDebtForPay.id.startsWith("party_")) {
        // Distribute payment across all debts for this party
        const partyName = selectedDebtForPay.partyName;
        const partyType = selectedDebtForPay.partyType;
        const partyDebtsToPay = clientDebts
          .filter(
            (d) =>
              ((d as any).partyName || "") === partyName &&
              ((d as any).partyType || "person") === partyType &&
              d.remainingAmount > 0
          )
          .sort((a, b) => b.remainingAmount - a.remainingAmount); // Pay larger debts first

        let remainingPay = pay;
        for (const debt of partyDebtsToPay) {
          if (remainingPay <= 0) break;
          const payForThisDebt = Math.min(remainingPay, debt.remainingAmount);
          const newPaid = debt.paidAmount + payForThisDebt;
          const newRemaining = Math.max(0, debt.amount - newPaid);
          await updateStandaloneDebt(debt.id, {
            paidAmount: newPaid,
            remainingAmount: newRemaining,
            status: newRemaining <= 0 ? "paid" : "active",
          });
          remainingPay -= payForThisDebt;
        }
      } else {
        // Regular single debt payment - use current debt data
        const newPaid = debtToPay.paidAmount + pay;
        const newRemaining = Math.max(0, debtToPay.amount - newPaid);
        await updateStandaloneDebt(debtToPay.id, {
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          status: newRemaining <= 0 ? "paid" : "active",
        });
      }
      setPayDebtDialogOpen(false);
      setSelectedDebtForPay(null);
      setPayDebtAmount("");
      setSnackbarMessage("تم الدفع بنجاح");
      setSnackbarOpen(true);
      if (partyProfileDialogOpen) {
        // Keep party profile open to see updated stats
      } else {
        setDebtsListDialogOpen(true);
      }
    } catch (error: any) {
      console.error("Error paying debt:", error);
      const errorMessage =
        error?.message || error?.toString() || "حدث خطأ أثناء الدفع";
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
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
      const amount = parseFloat(data.amount) || 0;
      if (!data.partyName || !data.description || amount <= 0) {
        setSnackbarMessage("يرجى ملء جميع الحقول المطلوبة");
        setSnackbarOpen(true);
        return;
      }

      if (editingDebt) {
        // عند التعديل، نحافظ على المبلغ المدفوع الحالي إذا كان المبلغ الجديد أكبر منه
        // وإلا نعدل المبلغ المدفوع ليكون مساوياً للمبلغ الجديد
        const newPaidAmount = Math.min(editingDebt.paidAmount, amount);
        const newRemaining = Math.max(0, amount - newPaidAmount);
        // Find party if exists
        const existingParty = clientDebtParties.find(
          (p) => p.name === data.partyName && p.type === data.partyType
        );
        await updateStandaloneDebt(editingDebt.id, {
          partyId: existingParty?.id || (editingDebt as any).partyId || "",
          partyType: data.partyType || "person",
          partyName: data.partyName,
          description: data.description,
          amount: amount,
          paidAmount: newPaidAmount,
          remainingAmount: newRemaining,
          status: newRemaining <= 0 ? "paid" : "active",
          date: data.date,
          notes: data.notes || "",
        });
        setEditingDebt(null);
        setSnackbarMessage("تم التعديل بنجاح");
      } else {
        // Find party if exists
        const existingParty = clientDebtParties.find(
          (p) => p.name === data.partyName && p.type === data.partyType
        );
        const newDebt: StandaloneDebt = {
          id: crypto.randomUUID(),
          clientId: clientId!,
          partyId: existingParty?.id || "",
          partyType: data.partyType || "person",
          partyName: data.partyName,
          description: data.description,
          amount: amount,
          paidAmount: 0,
          remainingAmount: amount,
          status: "active",
          date: data.date,
          notes: data.notes || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await addStandaloneDebt(newDebt);
        setSnackbarMessage("تمت الإضافة بنجاح");
      }
      setDebtDialogOpen(false);
      resetDebt({
        partyType: "person",
        partyName: "",
        description: "",
        amount: "" as any,
        date: dayjs().format("YYYY-MM-DD"),
        notes: "",
      });
      setDebtsListDialogOpen(true);
      setSnackbarOpen(true);
    } catch (error: any) {
      console.error("Error saving debt:", error);
      const errorMessage =
        error?.message || error?.toString() || "حدث خطأ أثناء الحفظ";
      setSnackbarMessage(errorMessage);
      setSnackbarOpen(true);
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
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                variant="h5"
                fontWeight={800}
                sx={{
                  color: "white",
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                  mb: 1,
                  wordBreak: "break-word",
                }}
              >
                {client.name}
              </Typography>
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{
                  mt: 0.5,
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.15)",
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 2,
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <Phone
                    sx={{
                      fontSize: { xs: 16, sm: 18 },
                      color: "white",
                      opacity: 0.95,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      color: "white",
                      fontWeight: 600,
                      fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                    }}
                  >
                    {client.phone}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
            <Stack
              direction="row"
              spacing={{ xs: 1.5, sm: 2 }}
              sx={{ flexShrink: 0 }}
            >
              <IconButton
                onClick={() => {
                  if (!client) return;
                  generateFinalReportPDF(
                    client,
                    clientExpenses,
                    clientPayments,
                    invoices.filter((inv) => inv.clientId === client.id)
                  );
                }}
                sx={{
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.2)",
                  width: { xs: 44, sm: 40 },
                  height: { xs: 44, sm: 40 },
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.3)",
                    transform: "scale(1.05)",
                  },
                  "&:active": {
                    transform: "scale(0.95)",
                  },
                  transition: "all 0.2s ease-in-out",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
                title="التقرير النهائي"
              >
                <Assessment sx={{ fontSize: { xs: 20, sm: 18 } }} />
              </IconButton>
              <IconButton
                onClick={() => setEditClientDialogOpen(true)}
                sx={{
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.2)",
                  width: { xs: 44, sm: 40 },
                  height: { xs: 44, sm: 40 },
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.3)",
                    transform: "scale(1.05)",
                  },
                  "&:active": {
                    transform: "scale(0.95)",
                  },
                  transition: "all 0.2s ease-in-out",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                <Edit sx={{ fontSize: { xs: 20, sm: 18 } }} />
              </IconButton>
            </Stack>
          </Stack>

          {/* Summary Cards */}
          <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
            <Grid size={{ xs: 6 }}>
              <Card
                sx={{
                  borderRadius: 2.5,
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)",
                  backdropFilter: "blur(20px)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.3)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                  transition: "all 0.2s ease",
                }}
              >
                <CardContent
                  sx={{
                    p: 1.5,
                    textAlign: "center",
                    "&:last-child": { pb: 1.5 },
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: "rgba(255,255,255,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 0.75,
                    }}
                  >
                    <TrendingDown sx={{ fontSize: 18, color: "white" }} />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.95,
                      display: "block",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      mb: 0.25,
                    }}
                  >
                    المصروفات
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                  >
                    {formatCurrency(summary.totalExpenses)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <Card
                sx={{
                  borderRadius: 2.5,
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)",
                  backdropFilter: "blur(20px)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.3)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                  transition: "all 0.2s ease",
                }}
              >
                <CardContent
                  sx={{
                    p: 1.5,
                    textAlign: "center",
                    "&:last-child": { pb: 1.5 },
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: "rgba(255,255,255,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 0.75,
                    }}
                  >
                    <Payment sx={{ fontSize: 18, color: "white" }} />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.95,
                      display: "block",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      mb: 0.25,
                    }}
                  >
                    المدفوع
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                  >
                    {formatCurrency(summary.totalPaid)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <Card
                sx={{
                  borderRadius: 2.5,
                  background:
                    summary.remaining >= 0
                      ? "linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.2) 100%)"
                      : "linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.2) 100%)",
                  backdropFilter: "blur(20px)",
                  color: "white",
                  border:
                    summary.remaining >= 0
                      ? "1px solid rgba(16, 185, 129, 0.4)"
                      : "1px solid rgba(239, 68, 68, 0.4)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                  transition: "all 0.2s ease",
                }}
              >
                <CardContent
                  sx={{
                    p: 1.5,
                    textAlign: "center",
                    "&:last-child": { pb: 1.5 },
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor:
                        summary.remaining >= 0
                          ? "rgba(16, 185, 129, 0.3)"
                          : "rgba(239, 68, 68, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 0.75,
                    }}
                  >
                    {summary.remaining >= 0 ? (
                      <TrendingUp sx={{ fontSize: 18, color: "white" }} />
                    ) : (
                      <TrendingDown sx={{ fontSize: 18, color: "white" }} />
                    )}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.95,
                      display: "block",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      mb: 0.25,
                    }}
                  >
                    المتبقي
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                  >
                    {formatCurrency(summary.remaining)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <Card
                sx={{
                  borderRadius: 2.5,
                  background:
                    "linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(124, 58, 237, 0.2) 100%)",
                  backdropFilter: "blur(20px)",
                  color: "white",
                  border: "1px solid rgba(139, 92, 246, 0.4)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                  transition: "all 0.2s ease",
                }}
              >
                <CardContent
                  sx={{
                    p: 1.5,
                    textAlign: "center",
                    "&:last-child": { pb: 1.5 },
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: "rgba(139, 92, 246, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 0.75,
                    }}
                  >
                    <TrendingUp sx={{ fontSize: 18, color: "white" }} />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.95,
                      display: "block",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      mb: 0.25,
                    }}
                  >
                    نسبة الربح
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
                  >
                    {summary.profitPercentage > 0
                      ? `${summary.profitPercentage}%`
                      : "غير محدد"}
                  </Typography>
                  {summary.profit > 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        opacity: 0.9,
                        display: "block",
                        fontSize: "0.6rem",
                        mt: 0.25,
                      }}
                    >
                      {formatCurrency(summary.profit)}
                    </Typography>
                  )}
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

        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <TextField
            fullWidth
            placeholder="ابحث في المصروفات..."
            value={expensesSearchQuery}
            onChange={(e) => setExpensesSearchQuery(e.target.value)}
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "background.paper",
                borderRadius: 2,
                "& fieldset": { border: "none" },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", pb: 2 }}>
          {filteredExpenses.length === 0 ? (
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
                {filteredExpenses.map((expense) => (
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
                                  <th>ملاحظات</th>
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
                                    <td style="color: #64748b; font-style: italic; font-size: 11px; max-width: 200px; word-wrap: break-word;">
                                      ${
                                        exp.notes
                                          ? `💬 ${exp.notes}`
                                          : '<span style="color: #94a3b8;">-</span>'
                                      }
                                    </td>
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

        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <TextField
            fullWidth
            placeholder="ابحث في المدفوعات..."
            value={paymentsSearchQuery}
            onChange={(e) => setPaymentsSearchQuery(e.target.value)}
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "background.paper",
                borderRadius: 2,
                "& fieldset": { border: "none" },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", pb: 2 }}>
          {filteredPayments.length === 0 ? (
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
                {filteredPayments.map((payment) => (
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
                                  <th>ملاحظات</th>
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
                                    <td style="color: #64748b; font-style: italic; font-size: 11px; max-width: 200px; word-wrap: break-word;">
                                      ${
                                        payment.notes
                                          ? `💬 ${payment.notes}`
                                          : '<span style="color: #94a3b8;">-</span>'
                                      }
                                    </td>
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

      {/* Debt Dialog */}
      <Dialog
        open={debtDialogOpen}
        onClose={() => {
          setDebtDialogOpen(false);
          setEditingDebt(null);
        }}
        fullScreen
      >
        <form onSubmit={handleDebtSubmit(onSubmitDebt)}>
          <Box
            sx={{
              background:
                theme.palette.mode === "light"
                  ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                  : "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
              color: "white",
              p: 2,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton
                onClick={() => {
                  setDebtDialogOpen(false);
                  setEditingDebt(null);
                }}
                sx={{ color: "white" }}
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                {editingDebt ? "تعديل دين" : "إضافة دين جديد"}
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ p: 3.5 }}>
            <Stack spacing={3.5}>
              <Controller
                name="partyType"
                control={debtControl}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>نوع الطرف</InputLabel>
                    <Select
                      {...field}
                      label="نوع الطرف"
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="person">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Person sx={{ fontSize: 18 }} />
                          <Typography>شخص</Typography>
                        </Stack>
                      </MenuItem>
                      <MenuItem value="shop">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Store sx={{ fontSize: 18 }} />
                          <Typography>محل</Typography>
                        </Stack>
                      </MenuItem>
                      <MenuItem value="company">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Business sx={{ fontSize: 18 }} />
                          <Typography>شركة</Typography>
                        </Stack>
                      </MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="partyName"
                control={debtControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="اسم الشخص/المحل/الشركة"
                    placeholder="مثال: محمد أحمد، محل الأجهزة، شركة البناء"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />

              <Controller
                name="description"
                control={debtControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="وصف الدين"
                    placeholder="مثال: دين على مواد بناء"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
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
                name="date"
                control={debtControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="تاريخ الدين"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />

              <Controller
                name="notes"
                control={debtControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="ملاحظات"
                    multiline
                    rows={3}
                    placeholder="أي ملاحظات إضافية..."
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
              <Button
                onClick={() => {
                  setDebtDialogOpen(false);
                  setEditingDebt(null);
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
                color="warning"
                fullWidth
                size="large"
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                {editingDebt ? "حفظ" : "إضافة"}
              </Button>
            </Stack>
          </Box>
        </form>
      </Dialog>

      {/* Debts List Dialog */}
      <Dialog
        open={debtsListDialogOpen}
        onClose={() => setDebtsListDialogOpen(false)}
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
                ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                : "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
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
                onClick={() => setDebtsListDialogOpen(false)}
                sx={{ color: "white" }}
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="h5" fontWeight={800} sx={{ flexGrow: 1 }}>
                الديون ({filteredParties.length})
              </Typography>
            </Stack>
            <Button
              variant="contained"
              onClick={handleAddParty}
              sx={{
                bgcolor: "white",
                color: "primary.main",
                fontWeight: 700,
                "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
                borderRadius: 2,
              }}
              startIcon={<Add />}
            >
              إضافة
            </Button>
          </Stack>
        </Box>

        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <TextField
            fullWidth
            placeholder="ابحث في الديون..."
            value={debtsSearchQuery}
            onChange={(e) => setDebtsSearchQuery(e.target.value)}
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "background.paper",
                borderRadius: 2,
                "& fieldset": { border: "none" },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", pb: 2 }}>
          {filteredParties.length === 0 ? (
            <Container
              maxWidth="sm"
              sx={{ mt: { xs: 4, sm: 6 }, px: { xs: 1.5, sm: 2 } }}
            >
              <Card
                sx={{
                  borderRadius: 2.5,
                  textAlign: "center",
                  py: 6,
                  bgcolor: "background.paper",
                  border:
                    theme.palette.mode === "dark"
                      ? "1px solid rgba(255,255,255,0.1)"
                      : "1px solid rgba(0,0,0,0.05)",
                }}
              >
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{ mb: 3, fontWeight: 600 }}
                >
                  لا توجد ديون
                </Typography>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<Add />}
                  onClick={() => {
                    setEditingDebt(null);
                    resetDebt({
                      partyType: "person",
                      partyName: "",
                      description: "",
                      amount: "" as any,
                      date: dayjs().format("YYYY-MM-DD"),
                      notes: "",
                    });
                    setDebtDialogOpen(true);
                  }}
                  sx={{
                    mt: 2,
                    borderRadius: 2,
                    px: 3,
                    py: 1.5,
                    fontWeight: 700,
                  }}
                >
                  أضف أول دين
                </Button>
              </Card>
            </Container>
          ) : (
            <Container
              maxWidth="sm"
              sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 1.5, sm: 2 } }}
            >
              <Stack spacing={{ xs: 2, sm: 2.5 }}>
                {filteredParties.map((party, index) => (
                  <Card
                    key={`${party.type}_${party.name}_${index}`}
                    onClick={() => handleOpenPartyProfile(party)}
                    sx={{
                      borderRadius: { xs: 2.5, sm: 3 },
                      boxShadow:
                        theme.palette.mode === "light"
                          ? "0 2px 12px rgba(0,0,0,0.06)"
                          : "0 2px 12px rgba(0,0,0,0.3)",
                      bgcolor: "background.paper",
                      border:
                        theme.palette.mode === "dark"
                          ? "1px solid rgba(255,255,255,0.08)"
                          : "1px solid rgba(0,0,0,0.05)",
                      cursor: "pointer",
                      transition: "all 0.2s ease-in-out",
                      "&:active": {
                        transform: "scale(0.98)",
                      },
                      "@media (hover: hover)": {
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow:
                            theme.palette.mode === "light"
                              ? "0 8px 24px rgba(0,0,0,0.12)"
                              : "0 8px 24px rgba(0,0,0,0.4)",
                        },
                      },
                    }}
                  >
                    <CardContent
                      sx={{
                        p: { xs: 2.5, sm: 3 },
                        "&:last-child": { pb: { xs: 2.5, sm: 3 } },
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="flex-start"
                        spacing={2}
                      >
                        <Avatar
                          sx={{
                            bgcolor:
                              party.type === "company"
                                ? "primary.light"
                                : party.type === "shop"
                                ? "secondary.light"
                                : "warning.light",
                            width: { xs: 52, sm: 56 },
                            height: { xs: 52, sm: 56 },
                            flexShrink: 0,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        >
                          {party.type === "company" ? (
                            <Business
                              sx={{
                                color: "primary.main",
                                fontSize: { xs: 24, sm: 28 },
                              }}
                            />
                          ) : party.type === "shop" ? (
                            <Store
                              sx={{
                                color: "secondary.main",
                                fontSize: { xs: 24, sm: 28 },
                              }}
                            />
                          ) : (
                            <Person
                              sx={{
                                color: "warning.main",
                                fontSize: { xs: 24, sm: 28 },
                              }}
                            />
                          )}
                        </Avatar>

                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={{ xs: 1, sm: 1.5 }}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            sx={{ mb: 2 }}
                            flexWrap="wrap"
                          >
                            <Chip
                              icon={
                                party.type === "company" ? (
                                  <Business sx={{ fontSize: 14 }} />
                                ) : party.type === "shop" ? (
                                  <Store sx={{ fontSize: 14 }} />
                                ) : (
                                  <Person sx={{ fontSize: 14 }} />
                                )
                              }
                              label={
                                party.type === "company"
                                  ? "شركة"
                                  : party.type === "shop"
                                  ? "محل"
                                  : "شخص"
                              }
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{
                                height: 24,
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}
                            />
                            <Typography
                              variant="h6"
                              fontWeight={800}
                              sx={{
                                fontSize: { xs: "1rem", sm: "1.25rem" },
                                wordBreak: "break-word",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {party.name}
                            </Typography>
                            <Chip
                              label={`${party.debts.length} دين`}
                              size="small"
                              color="info"
                              sx={{ height: 22, fontSize: "0.7rem" }}
                            />
                          </Stack>

                          <Grid
                            container
                            spacing={{ xs: 1.5, sm: 2 }}
                            sx={{ mt: { xs: 1, sm: 1.5 } }}
                          >
                            <Grid size={{ xs: 4 }}>
                              <Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  display="block"
                                  sx={{
                                    mb: 0.5,
                                    fontSize: { xs: "0.65rem", sm: "0.75rem" },
                                  }}
                                >
                                  إجمالي الدين
                                </Typography>
                                <Typography
                                  variant="body1"
                                  fontWeight={800}
                                  color="primary.main"
                                  sx={{
                                    fontSize: { xs: "0.875rem", sm: "1rem" },
                                  }}
                                >
                                  {formatCurrency(party.totalAmount)}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 4 }}>
                              <Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  display="block"
                                  sx={{
                                    mb: 0.5,
                                    fontSize: { xs: "0.65rem", sm: "0.75rem" },
                                  }}
                                >
                                  المدفوع
                                </Typography>
                                <Typography
                                  variant="body1"
                                  fontWeight={800}
                                  color="success.main"
                                  sx={{
                                    fontSize: { xs: "0.875rem", sm: "1rem" },
                                  }}
                                >
                                  {formatCurrency(party.totalPaid)}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 4 }}>
                              <Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  display="block"
                                  sx={{
                                    mb: 0.5,
                                    fontSize: { xs: "0.65rem", sm: "0.75rem" },
                                  }}
                                >
                                  المتبقي
                                </Typography>
                                <Typography
                                  variant="body1"
                                  fontWeight={800}
                                  color="warning.main"
                                  sx={{
                                    fontSize: { xs: "0.875rem", sm: "1rem" },
                                  }}
                                >
                                  {formatCurrency(party.totalRemaining)}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>

                        <Box
                          sx={{
                            flexShrink: 0,
                            display: { xs: "none", sm: "block" },
                          }}
                        >
                          <ChevronLeft
                            sx={{ color: "text.secondary", fontSize: 28 }}
                          />
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>

              {/* Total Summary */}
              <Card
                sx={{
                  mt: 3,
                  mb: 2,
                  borderRadius: 2.5,
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(245, 158, 11, 0.1)",
                  border: `2px solid ${theme.palette.warning.main}`,
                }}
              >
                <CardContent sx={{ p: 3, textAlign: "center" }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    إجمالي الديون
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={900}
                    color="warning.main"
                  >
                    {formatCurrency(
                      clientDebts.reduce((sum, d) => sum + d.remainingAmount, 0)
                    )}
                  </Typography>
                </CardContent>
              </Card>
            </Container>
          )}
        </Box>
      </Dialog>

      {/* Pay Debt Dialog */}
      <Dialog
        open={payDebtDialogOpen}
        onClose={() => {
          setPayDebtDialogOpen(false);
          setSelectedDebtForPay(null);
          setPayDebtAmount("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>
            دفع جزء من الدين
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedDebtForPay && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack spacing={1} sx={{ mb: 2 }}>
                <Chip
                  icon={
                    ((selectedDebtForPay as any).partyType || "person") ===
                    "company" ? (
                      <Business sx={{ fontSize: 14 }} />
                    ) : ((selectedDebtForPay as any).partyType || "person") ===
                      "shop" ? (
                      <Store sx={{ fontSize: 14 }} />
                    ) : (
                      <Person sx={{ fontSize: 14 }} />
                    )
                  }
                  label={
                    ((selectedDebtForPay as any).partyType || "person") ===
                    "company"
                      ? "شركة"
                      : ((selectedDebtForPay as any).partyType || "person") ===
                        "shop"
                      ? "محل"
                      : "شخص"
                  }
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Typography variant="body1" fontWeight={700}>
                  {(selectedDebtForPay as any).partyName || "غير محدد"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  الوصف: {selectedDebtForPay.description}
                </Typography>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">
                المبلغ الكلي: {formatCurrency(selectedDebtForPay.amount)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                المدفوع: {formatCurrency(selectedDebtForPay.paidAmount)}
              </Typography>
              <Typography variant="body2" fontWeight={700} color="warning.main">
                المتبقي: {formatCurrency(selectedDebtForPay.remainingAmount)}
              </Typography>
              <TextField
                fullWidth
                label="المبلغ المدفوع"
                type="number"
                value={payDebtAmount}
                onChange={(e) => setPayDebtAmount(e.target.value)}
                placeholder={`أقصى مبلغ: ${formatCurrency(
                  selectedDebtForPay.remainingAmount
                )}`}
                inputProps={{
                  max: selectedDebtForPay.remainingAmount,
                  min: 0,
                }}
                sx={{ mt: 2 }}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => {
              setPayDebtDialogOpen(false);
              setSelectedDebtForPay(null);
              setPayDebtAmount("");
            }}
            sx={{ borderRadius: 2 }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handlePayDebt}
            variant="contained"
            color="success"
            sx={{ borderRadius: 2 }}
          >
            دفع
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Party Dialog */}
      <Dialog
        open={partyDialogOpen}
        onClose={() => {
          setPartyDialogOpen(false);
          setEditingParty(null);
          resetParty({
            name: "",
            phone: "",
            address: "",
            type: "person",
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>
            {editingParty ? "تعديل البروفايل" : "إضافة بروفايل جديد"}
          </Typography>
        </DialogTitle>
        <form onSubmit={handlePartySubmit(onSubmitParty)}>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <Controller
                name="type"
                control={partyControl}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>نوع البروفايل</InputLabel>
                    <Select
                      {...field}
                      label="نوع البروفايل"
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="person">شخص</MenuItem>
                      <MenuItem value="shop">محل</MenuItem>
                      <MenuItem value="company">شركة</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="name"
                control={partyControl}
                rules={{ required: "الاسم مطلوب" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="الاسم"
                    required
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />

              <Controller
                name="phone"
                control={partyControl}
                rules={{ required: "رقم الهاتف مطلوب" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="رقم الهاتف"
                    required
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />

              <Controller
                name="address"
                control={partyControl}
                rules={{ required: "العنوان مطلوب" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="العنوان"
                    required
                    multiline
                    rows={2}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button
              onClick={() => {
                setPartyDialogOpen(false);
                setEditingParty(null);
                resetParty({
                  name: "",
                  phone: "",
                  address: "",
                  type: "person",
                });
              }}
              sx={{ borderRadius: 2 }}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              sx={{ borderRadius: 2 }}
            >
              {editingParty ? "حفظ" : "إضافة"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Party Profile Dialog */}
      <Dialog
        open={partyProfileDialogOpen}
        onClose={() => {
          setPartyProfileDialogOpen(false);
          setSelectedParty(null);
        }}
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
                ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                : "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
            color: "white",
            p: 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton
              onClick={() => {
                setPartyProfileDialogOpen(false);
                setSelectedParty(null);
              }}
              sx={{ color: "white" }}
            >
              <ArrowBack />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                {selectedParty?.type === "company" ? (
                  <Business sx={{ fontSize: 28 }} />
                ) : selectedParty?.type === "shop" ? (
                  <Store sx={{ fontSize: 28 }} />
                ) : (
                  <Person sx={{ fontSize: 28 }} />
                )}
                <Typography variant="h5" fontWeight={800}>
                  {selectedParty?.name}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
                {selectedParty?.type === "company"
                  ? "شركة"
                  : selectedParty?.type === "shop"
                  ? "محل"
                  : "شخص"}
              </Typography>
            </Box>
          </Stack>

          {/* Stats Cards */}
          <Grid
            container
            spacing={{ xs: 1.5, sm: 2 }}
            sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 0.5, sm: 0 } }}
          >
            <Grid size={{ xs: 4 }}>
              <Card
                sx={{
                  bgcolor: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: { xs: 1.5, sm: 2 },
                  color: "white",
                  height: "100%",
                }}
              >
                <CardContent
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    textAlign: "center",
                    "&:last-child": { pb: { xs: 1.5, sm: 2 } },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.9,
                      fontSize: { xs: "0.65rem", sm: "0.7rem" },
                      display: "block",
                    }}
                  >
                    إجمالي الدين
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={800}
                    sx={{
                      mt: 0.5,
                      fontSize: { xs: "0.875rem", sm: "1.25rem" },
                    }}
                  >
                    {formatCurrency(partyStats.totalAmount)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Card
                sx={{
                  bgcolor: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: { xs: 1.5, sm: 2 },
                  color: "white",
                  height: "100%",
                }}
              >
                <CardContent
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    textAlign: "center",
                    "&:last-child": { pb: { xs: 1.5, sm: 2 } },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.9,
                      fontSize: { xs: "0.65rem", sm: "0.7rem" },
                      display: "block",
                    }}
                  >
                    المدفوع
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={800}
                    sx={{
                      mt: 0.5,
                      fontSize: { xs: "0.875rem", sm: "1.25rem" },
                    }}
                  >
                    {formatCurrency(partyStats.totalPaid)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Card
                sx={{
                  bgcolor: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: { xs: 1.5, sm: 2 },
                  color: "white",
                  height: "100%",
                }}
              >
                <CardContent
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    textAlign: "center",
                    "&:last-child": { pb: { xs: 1.5, sm: 2 } },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.9,
                      fontSize: { xs: "0.65rem", sm: "0.7rem" },
                      display: "block",
                    }}
                  >
                    المتبقي
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={800}
                    sx={{
                      mt: 0.5,
                      fontSize: { xs: "0.875rem", sm: "1.25rem" },
                    }}
                  >
                    {formatCurrency(partyStats.totalRemaining)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Box
            sx={{
              mt: { xs: 1.5, sm: 2 },
              px: { xs: 1.5, sm: 2 },
              pb: { xs: 1, sm: 1.5 },
            }}
          >
            <Stack spacing={{ xs: 1.2, sm: 1.5 }}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<Add />}
                onClick={() => {
                  if (selectedParty) {
                    setEditingDebt(null);
                    resetDebt({
                      partyType: selectedParty.type,
                      partyName: selectedParty.name,
                      description: "",
                      amount: "" as any,
                      date: dayjs().format("YYYY-MM-DD"),
                      notes: "",
                    });
                    setDebtDialogOpen(true);
                    setPartyProfileDialogOpen(false);
                  }
                }}
                sx={{
                  bgcolor: "white",
                  color: "primary.main",
                  fontWeight: 700,
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                  "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
                  "&:active": { transform: "scale(0.98)" },
                  borderRadius: { xs: 1.5, sm: 2 },
                  py: { xs: 1.2, sm: 1.5 },
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                إضافة دين جديد
              </Button>
              {partyStats.totalRemaining > 0 && (
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<Payment />}
                  onClick={() => {
                    // Create a virtual debt for the entire party
                    const virtualDebt: StandaloneDebt = {
                      id: `party_${selectedParty?.id}`,
                      clientId: clientId!,
                      partyId: selectedParty?.id || "",
                      partyName: selectedParty?.name || "",
                      partyType: selectedParty?.type || "person",
                      description: `إجمالي ديون ${selectedParty?.name}`,
                      amount: partyStats.totalAmount,
                      paidAmount: partyStats.totalPaid,
                      remainingAmount: partyStats.totalRemaining,
                      status: partyStats.totalRemaining > 0 ? "active" : "paid",
                      date: dayjs().format("YYYY-MM-DD"),
                      createdAt: "",
                      updatedAt: "",
                    };
                    setSelectedDebtForPay(virtualDebt);
                    setPayDebtAmount("");
                    setPayDebtDialogOpen(true);
                  }}
                  sx={{
                    bgcolor: "white",
                    color: "warning.main",
                    fontWeight: 700,
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
                    "&:active": { transform: "scale(0.98)" },
                    borderRadius: { xs: 1.5, sm: 2 },
                    py: { xs: 1.2, sm: 1.5 },
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                >
                  <Box
                    component="span"
                    sx={{ display: { xs: "none", sm: "inline" } }}
                  >
                    دفع من إجمالي الدين (
                    {formatCurrency(partyStats.totalRemaining)})
                  </Box>
                  <Box
                    component="span"
                    sx={{ display: { xs: "inline", sm: "none" } }}
                  >
                    دفع ({formatCurrency(partyStats.totalRemaining)})
                  </Box>
                </Button>
              )}
            </Stack>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", pb: { xs: 2, sm: 3 } }}>
          <Container
            maxWidth="sm"
            sx={{ mt: { xs: 1.5, sm: 2 }, px: { xs: 1.5, sm: 2 } }}
          >
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{
                mb: { xs: 1.5, sm: 2 },
                px: 0.5,
                fontSize: { xs: "1rem", sm: "1.25rem" },
              }}
            >
              سجل الديون ({partyDebts.length})
            </Typography>

            {partyDebts.length === 0 ? (
              <Card
                sx={{
                  borderRadius: { xs: 2, sm: 2.5 },
                  textAlign: "center",
                  py: { xs: 5, sm: 6 },
                  bgcolor: "background.paper",
                }}
              >
                <CreditCard
                  sx={{
                    fontSize: { xs: 50, sm: 60 },
                    color: "text.secondary",
                    opacity: 0.3,
                    mb: 2,
                  }}
                />
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{ fontSize: { xs: "0.875rem", sm: "1.25rem" } }}
                >
                  لا توجد ديون
                </Typography>
              </Card>
            ) : (
              <Stack spacing={{ xs: 2, sm: 2.5 }}>
                {partyDebts.map((debt) => (
                  <Card
                    key={debt.id}
                    sx={{
                      borderRadius: { xs: 2, sm: 2.5 },
                      boxShadow:
                        theme.palette.mode === "light"
                          ? "0 2px 8px rgba(0,0,0,0.06)"
                          : "0 2px 8px rgba(0,0,0,0.3)",
                      bgcolor: "background.paper",
                      border:
                        theme.palette.mode === "dark"
                          ? "1px solid rgba(255,255,255,0.1)"
                          : "1px solid rgba(0,0,0,0.05)",
                    }}
                  >
                    <CardContent
                      sx={{
                        p: { xs: 2, sm: 2.5 },
                        "&:last-child": { pb: { xs: 2, sm: 2.5 } },
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="flex-start"
                        spacing={{ xs: 1.5, sm: 2 }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: "warning.light",
                            width: { xs: 44, sm: 48 },
                            height: { xs: 44, sm: 48 },
                            flexShrink: 0,
                          }}
                        >
                          <CreditCard
                            sx={{
                              color: "warning.main",
                              fontSize: { xs: 18, sm: 20 },
                            }}
                          />
                        </Avatar>

                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={{ xs: 0.75, sm: 1.5 }}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            sx={{ mb: { xs: 1, sm: 1.25 } }}
                            flexWrap="wrap"
                          >
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{
                                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
                                wordBreak: "break-word",
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              {debt.description}
                            </Typography>
                            <Chip
                              label={debt.status === "paid" ? "مدفوع" : "نشط"}
                              size="small"
                              color={
                                debt.status === "paid" ? "success" : "warning"
                              }
                              sx={{
                                height: 20,
                                fontSize: "0.65rem",
                                flexShrink: 0,
                              }}
                            />
                          </Stack>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{
                              mb: { xs: 1, sm: 1.25 },
                              fontSize: { xs: "0.7rem", sm: "0.75rem" },
                            }}
                          >
                            {dayjs(debt.date).format("DD/MM/YYYY")}
                          </Typography>

                          {debt.notes && (
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
                                borderRight: `2px solid ${theme.palette.warning.main}`,
                              }}
                            >
                              💬 {debt.notes}
                            </Typography>
                          )}

                          <Typography
                            variant="h6"
                            fontWeight={800}
                            color="primary.main"
                            sx={{
                              fontSize: { xs: "1rem", sm: "1.25rem" },
                              mb: { xs: 1, sm: 0 },
                            }}
                          >
                            {formatCurrency(debt.amount)}
                          </Typography>
                        </Box>

                        <Stack
                          direction="row"
                          spacing={{ xs: 1, sm: 1.5 }}
                          sx={{
                            flexShrink: 0,
                            alignSelf: { xs: "flex-start", sm: "center" },
                          }}
                        >
                          {debt.remainingAmount > 0 && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleOpenPayDebtDialog(debt);
                              }}
                              sx={{
                                bgcolor: "success.main",
                                color: "white",
                                width: { xs: 36, sm: 32 },
                                height: { xs: 36, sm: 32 },
                                "&:hover": { bgcolor: "success.dark" },
                                "&:active": { transform: "scale(0.9)" },
                              }}
                            >
                              <Payment sx={{ fontSize: { xs: 18, sm: 16 } }} />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditDebt(debt);
                              setPartyProfileDialogOpen(false);
                            }}
                            sx={{
                              bgcolor: "primary.main",
                              color: "white",
                              width: { xs: 36, sm: 32 },
                              height: { xs: 36, sm: 32 },
                              "&:hover": { bgcolor: "primary.dark" },
                              "&:active": { transform: "scale(0.9)" },
                            }}
                          >
                            <Edit sx={{ fontSize: { xs: 18, sm: 16 } }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteDebt(debt.id);
                            }}
                            sx={{
                              bgcolor: "error.main",
                              color: "white",
                              width: { xs: 36, sm: 32 },
                              height: { xs: 36, sm: 32 },
                              "&:hover": { bgcolor: "error.dark" },
                              "&:active": { transform: "scale(0.9)" },
                            }}
                          >
                            <Delete sx={{ fontSize: { xs: 18, sm: 16 } }} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Container>
        </Box>
      </Dialog>

      {/* Profit Calculation Dialog */}
      <Dialog
        open={profitDialogOpen}
        onClose={() => setProfitDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
            color: "white",
            fontWeight: 800,
            py: 2.5,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <TrendingUp sx={{ fontSize: 28 }} />
            <Typography variant="h6" fontWeight={800}>
              حساب الأرباح
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5 }}
              >
                أدخل النسبة المئوية للأرباح من المصروفات (مثال: 10)
              </Typography>
              <TextField
                fullWidth
                label="النسبة المئوية (%)"
                type="number"
                value={profitPercentage}
                onChange={(e) => setProfitPercentage(e.target.value)}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />
            </Box>
            {profitPercentage && !isNaN(parseFloat(profitPercentage)) && (
              <Card
                sx={{
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(139, 92, 246, 0.1)"
                      : "#f3f4f6",
                  border: `2px solid ${
                    theme.palette.mode === "dark"
                      ? "rgba(139, 92, 246, 0.3)"
                      : "#e5e7eb"
                  }`,
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <Stack spacing={1.5}>
                  <Typography variant="body2" color="text.secondary">
                    إجمالي المصروفات للعميل ({client?.name}):
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={800}
                    color="primary.main"
                  >
                    {formatCurrency(
                      clientExpenses.reduce((sum, exp) => sum + exp.amount, 0)
                    )}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ opacity: 0.8 }}
                  >
                    عدد المصروفات: {clientExpenses.length}
                  </Typography>
                  <Divider />
                  <Typography variant="body2" color="text.secondary">
                    النسبة المئوية: {profitPercentage}%
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={900}
                    color="success.main"
                  >
                    الأرباح المتوقعة:{" "}
                    {formatCurrency(
                      (clientExpenses.reduce(
                        (sum, exp) => sum + exp.amount,
                        0
                      ) *
                        parseFloat(profitPercentage)) /
                        100
                    )}
                  </Typography>
                </Stack>
              </Card>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button
            onClick={() => setProfitDialogOpen(false)}
            sx={{ borderRadius: 2 }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSaveProfitPercentage}
            variant="contained"
            sx={{
              borderRadius: 2,
              bgcolor: "#8b5cf6",
              "&:hover": { bgcolor: "#7c3aed" },
            }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog
        open={editClientDialogOpen}
        onClose={() => setEditClientDialogOpen(false)}
        fullScreen
        sx={{
          "& .MuiDialog-paper": {
            bgcolor: theme.palette.mode === "dark" ? "#1e293b" : "#fff",
          },
        }}
      >
        <form onSubmit={handleClientSubmit(onSubmitClient)}>
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
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton
                onClick={() => setEditClientDialogOpen(false)}
                sx={{ color: "white" }}
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                تعديل بيانات العميل
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ p: 3.5 }}>
            <Stack spacing={3}>
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
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mt: 5 }}>
              <Button
                onClick={() => setEditClientDialogOpen(false)}
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
