import { useMemo, useState } from "react";
import {
  Add,
  Delete,
  Edit,
  Payment,
  Person,
  Store,
  Search,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useTheme,
  Divider,
} from "@mui/material";
import dayjs from "dayjs";
import { useDataStore } from "@/store/useDataStore";
import { useAuthStore } from "@/store/useAuthStore";
import type { StandaloneDebt } from "@/types";
import { formatCurrency } from "@/utils/calculations";

export const DebtsPage = () => {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const {
    clients,
    standaloneDebts,
    addStandaloneDebt,
    updateStandaloneDebt,
    deleteStandaloneDebt,
  } = useDataStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paid">(
    "all"
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<StandaloneDebt | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<StandaloneDebt | null>(null);
  const [payAmount, setPayAmount] = useState<string>("");
  const [form, setForm] = useState({
    clientId: "",
    description: "",
    amount: "",
    date: dayjs().format("YYYY-MM-DD"),
    notes: "",
  });

  const filteredDebts = useMemo(() => {
    return standaloneDebts
      .filter((debt) => {
        const client = clients.find((c) => c.id === debt.clientId);
        const matchesSearch =
          debt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          debt.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client?.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
          statusFilter === "all" ? true : debt.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));
  }, [standaloneDebts, clients, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const totalAmount = standaloneDebts.reduce((sum, d) => sum + d.amount, 0);
    const totalPaid = standaloneDebts.reduce((sum, d) => sum + d.paidAmount, 0);
    const totalRemaining = standaloneDebts.reduce(
      (sum, d) => sum + d.remainingAmount,
      0
    );
    return { totalAmount, totalPaid, totalRemaining };
  }, [standaloneDebts]);

  const handleOpenDialog = (debt?: StandaloneDebt) => {
    if (debt) {
      setEditingDebt(debt);
      setForm({
        clientId: debt.clientId,
        description: debt.description,
        amount: String(debt.amount),
        date: debt.date,
        notes: debt.notes || "",
      });
    } else {
      setEditingDebt(null);
      setForm({
        clientId: "",
        description: "",
        amount: "",
        date: dayjs().format("YYYY-MM-DD"),
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const amount = parseFloat(form.amount) || 0;
    if (!form.clientId || !form.description || amount <= 0) return;

    if (editingDebt) {
      const clampedPaid = Math.min(editingDebt.paidAmount, amount);
      const newRemaining = Math.max(0, amount - clampedPaid);
      await updateStandaloneDebt(editingDebt.id, {
        clientId: form.clientId,
        description: form.description,
        amount,
        paidAmount: clampedPaid,
        remainingAmount: newRemaining,
        status: newRemaining <= 0 ? "paid" : "active",
        date: form.date,
        notes: form.notes,
      });
    } else {
      const newDebt: StandaloneDebt = {
        id: crypto.randomUUID(),
        clientId: form.clientId,
        description: form.description,
        amount,
        paidAmount: 0,
        remainingAmount: amount,
        status: "active",
        date: form.date,
        notes: form.notes,
        // Default values for missing fields to satisfy type definition
        partyId: "", 
        partyType: "person",
        partyName: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await addStandaloneDebt(newDebt);
    }

    setDialogOpen(false);
    setEditingDebt(null);
    setForm({
      clientId: "",
      description: "",
      amount: "",
      date: dayjs().format("YYYY-MM-DD"),
      notes: "",
    });
  };

  const handleDelete = async (debtId: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الدين؟")) {
      await deleteStandaloneDebt(debtId);
    }
  };

  const handleOpenPayDialog = (debt: StandaloneDebt) => {
    setSelectedDebt(debt);
    setPayAmount("");
    setPayDialogOpen(true);
  };

  const handlePay = async () => {
    if (!selectedDebt) return;
    const pay = parseFloat(payAmount) || 0;
    if (pay <= 0 || pay > selectedDebt.remainingAmount) return;
    const newPaid = selectedDebt.paidAmount + pay;
    const newRemaining = Math.max(0, selectedDebt.amount - newPaid);
    await updateStandaloneDebt(selectedDebt.id, {
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      status: newRemaining <= 0 ? "paid" : "active",
    });
    setPayDialogOpen(false);
    setSelectedDebt(null);
  };

  const statusChip = (status: StandaloneDebt["status"]) => {
    const config =
      status === "paid"
        ? { label: "مدفوع", color: "success" as const }
        : { label: "نشط", color: "warning" as const };
    return <Chip size="small" label={config.label} color={config.color} />;
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: theme.palette.background.default,
        pb: 8,
        position: 'relative'
      }}
    >
      {/* Background Ambience */}
      <Box sx={{
         position: 'absolute', top: 0, left: 0, right: 0, height: 400,
         background: theme.palette.mode === 'dark' 
           ? 'linear-gradient(180deg, #b45309 0%, transparent 100%)' 
           : 'linear-gradient(180deg, #fef3c7 0%, transparent 100%)',
         zIndex: 0,
         opacity: 0.5
      }} />

      {/* Header */}
      <Box sx={{ position: 'relative', zIndex: 1, pt: 4, pb: 4, px: 2 }}>
         <Grid container spacing={3} alignItems="center" sx={{ mb: 4 }}>
             <Grid size={{ xs: 12, md: 8 }}>
                <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>الديون الخارجية</Typography>
                <Typography variant="body2" color="text.secondary">متابعة الديون المستحقة للأشخاص والمحلات</Typography>
             </Grid>
             <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                 <Button
                   variant="contained"
                   onClick={() => handleOpenDialog()}
                   sx={{
                     background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                     boxShadow: '0 8px 20px -4px rgba(139, 92, 246, 0.5)',
                     fontWeight: 700,
                     px: 3, py: 1.5,
                     borderRadius: 3,
                     '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 24px -4px rgba(139, 92, 246, 0.6)' }
                   }}
                   startIcon={<Add />}
                 >
                   إضافة دين جديد
                 </Button>
             </Grid>
         </Grid>

       {/* Stats Grid */}
       <Grid container spacing={2} sx={{ mb: 4 }}>
         <Grid size={{ xs: 12, sm: 4 }}>
           <Card sx={{ 
              height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider',
              background: theme.palette.background.paper, boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
           }}>
             <CardContent>
               <Typography variant="subtitle2" color="text.secondary" fontWeight={700} gutterBottom>
                 إجمالي الديون
               </Typography>
               <Typography variant="h4" fontWeight={900} sx={{ color: theme.palette.text.primary }}>
                 {formatCurrency(stats.totalAmount)}
               </Typography>
             </CardContent>
           </Card>
         </Grid>
         <Grid size={{ xs: 12, sm: 4 }}>
           <Card sx={{ 
              height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'rgba(16, 185, 129, 0.2)',
              background: theme.palette.mode === 'dark' ? 'rgba(6, 78, 59, 0.2)' : '#f0fdf4',
              boxShadow: 'none'
           }}>
             <CardContent>
               <Typography variant="subtitle2" color="text.secondary" fontWeight={700} gutterBottom>
                 المدفوع
               </Typography>
               <Typography variant="h4" fontWeight={900} sx={{ color: '#059669' }}>
                 {formatCurrency(stats.totalPaid)}
               </Typography>
             </CardContent>
           </Card>
         </Grid>
         <Grid size={{ xs: 12, sm: 4 }}>
           <Card sx={{ 
              height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'rgba(245, 158, 11, 0.2)',
              background: theme.palette.mode === 'dark' ? 'rgba(120, 53, 15, 0.2)' : '#fffbeb',
              boxShadow: 'none'
           }}>
             <CardContent>
               <Typography variant="subtitle2" color="text.secondary" fontWeight={700} gutterBottom>
                 المتبقي
               </Typography>
               <Typography variant="h4" fontWeight={900} sx={{ color: '#d97706' }}>
                 {formatCurrency(stats.totalRemaining)}
               </Typography>
             </CardContent>
           </Card>
         </Grid>
       </Grid>

      {/* Filters */}
      <Card sx={{ 
          borderRadius: 4, 
          p: 1, 
          mb: 4,
          bgcolor: 'rgba(255,255,255,0.6)', 
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)'
      }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" p={1}>
            <TextField
              fullWidth
              placeholder="ابحث بالاسم، الملاحظة، أو الجهة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                startAdornment: (
                    <Search sx={{ color: "text.secondary", mr: 1.5, ml: 1 }} />
                ),
              }}
            />
            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' }, height: 30, my: 'auto' }} />
            <TextField
              select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "active" | "paid")
              }
              variant="standard"
              InputProps={{ disableUnderline: true }}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">الكل</MenuItem>
              <MenuItem value="active">نشط (غير مدفوع)</MenuItem>
              <MenuItem value="paid">مدفوع بالكامل</MenuItem>
            </TextField>
        </Stack>
      </Card>

      {/* Debts list */}
      <Stack spacing={2}>
        {filteredDebts.map((debt) => {
          const client = clients.find((c) => c.id === debt.clientId);
          return (
            <Card
              key={debt.id}
              sx={{
                borderRadius: 4,
                bgcolor: 'background.paper',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease-in-out',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={2.5} alignItems="flex-start">
                  <Box sx={{ 
                     width: 56, height: 56, borderRadius: 3, 
                     bgcolor: client?.type === 'company' ? '#ffedd5' : '#fff7ed',
                     color: client?.type === 'company' ? '#c2410c' : '#ea580c',
                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                     flexShrink: 0
                  }}>
                     {client?.type === 'company' ? <Store fontSize="medium" /> : <Person fontSize="medium" />}
                  </Box>

                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      mb={1}
                    >
                      <Typography variant="subtitle1" fontWeight={800} noWrap>
                        {debt.description}
                      </Typography>
                      {client && (
                        <Chip
                          size="small"
                          label={client.name}
                          sx={{ borderRadius: 1.5, bgcolor: 'action.hover', fontWeight: 600 }}
                        />
                      )}
                      {statusChip(debt.status)}
                    </Stack>
                    
                    <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                       تاريخ الدين: {dayjs(debt.date).format("DD/MM/YYYY")}
                       {debt.addedBy && ` • بواسطة: ${debt.addedBy}`}
                    </Typography>

                    {debt.notes && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2, p: 1.5, borderRadius: 2,
                          bgcolor: 'action.hover',
                          borderRight: '3px solid', borderColor: 'primary.main',
                          fontStyle: 'italic'
                        }}
                      >
                        {debt.notes}
                      </Typography>
                    )}

                    <Divider sx={{ borderStyle: 'dashed', mb: 2 }} />

                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="center"
                      justifyContent="space-between"
                      flexWrap="wrap"
                    >
                       <Stack direction="row" spacing={3}>
                           <Box>
                              <Typography variant="caption" color="text.secondary">المبلغ الكلي</Typography>
                              <Typography variant="body1" fontWeight={700}>{formatCurrency(debt.amount)}</Typography>
                           </Box>
                           <Box>
                              <Typography variant="caption" color="text.secondary">مدفوع</Typography>
                              <Typography variant="body1" fontWeight={700} color="success.main">{formatCurrency(debt.paidAmount)}</Typography>
                           </Box>
                           <Box>
                              <Typography variant="caption" color="text.secondary">متبقي</Typography>
                              <Typography variant="body1" fontWeight={700} color="warning.main">{formatCurrency(debt.remainingAmount)}</Typography>
                           </Box>
                       </Stack>

                       <Stack direction="row" spacing={1}>
                         <Button
                           size="small"
                           variant="contained"
                           color="primary"
                           startIcon={<Payment />}
                           onClick={() => handleOpenPayDialog(debt)}
                           disabled={debt.status === 'paid'}
                           sx={{ borderRadius: 2, px: 2 }}
                         >
                            سداد
                         </Button>
                         <IconButton
                           size="small"
                           onClick={() => handleOpenDialog(debt)}
                           sx={{ bgcolor: "action.hover", borderRadius: 2 }}
                         >
                           <Edit fontSize="small" />
                         </IconButton>
                         <IconButton
                           size="small"
                           color="error"
                           onClick={() => handleDelete(debt.id)}
                           sx={{ bgcolor: "action.hover", borderRadius: 2, '&:hover': { bgcolor: 'fee2e2', color: 'error.main' } }}
                         >
                           <Delete fontSize="small" />
                         </IconButton>
                      </Stack>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          );
        })}

        {filteredDebts.length === 0 && (
          <Card sx={{ textAlign: "center", py: 8, borderRadius: 4, bgcolor: 'background.paper', border: '1px dashed', borderColor: 'divider', boxShadow: 'none' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              لا توجد ديون مسجلة
            </Typography>
            <Button variant="outlined" startIcon={<Add />} onClick={() => handleOpenDialog()} sx={{ mt: 2, borderRadius: 3 }}>
               تسجيل دين جديد
            </Button>
          </Card>
        )}
      </Stack>
      </Box>

      {/* Add / Edit Debt Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullScreen
      >
        <Box sx={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: 'white', p: 3, display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={700}>
               {editingDebt ? "تعديل بيانات الدين" : "تسجيل دين جديد"}
            </Typography>
            <Box flexGrow={1} />
            <IconButton onClick={() => setDialogOpen(false)} sx={{ color: 'white' }}>
               <Delete sx={{ transform: 'rotate(45deg)' }} /> {/* Using Delete as Close Icon representation if Close not imported, or just reuse Delete rotated */}
            </IconButton>
        </Box>

        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              select
              label="العميل"
              value={form.clientId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, clientId: e.target.value }))
              }
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              {clients.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="اسم الشخص / المحل / الوصف"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Grid container spacing={2}>
               <Grid size={{ xs: 6 }}>
                  <TextField
                    label="المبلغ الكلي"
                    type="number"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
               </Grid>
               <Grid size={{ xs: 6 }}>
                  <TextField
                    label="التاريخ"
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
               </Grid>
            </Grid>

            <TextField
              label="ملاحظات إضافية"
              multiline
              minRows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDialogOpen(false)} size="large" sx={{ borderRadius: 2, mr: 1 }}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit} size="large" sx={{ borderRadius: 2, px: 4 }}>
            {editingDebt ? "حفظ التعديلات" : "إضافة الدين"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Partial payment dialog */}
      <Dialog open={payDialogOpen} onClose={() => setPayDialogOpen(false)} fullWidth maxWidth="xs">
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
           <Typography variant="h6" fontWeight={700}>سداد دفعة من الدين</Typography>
        </Box>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              المتبقي: {formatCurrency(selectedDebt?.remainingAmount || 0)}
            </Typography>
            <TextField
              label="قيمة الدفعة"
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handlePay}>
            تأكيد الدفع
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

