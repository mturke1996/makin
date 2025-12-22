import { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
} from '@mui/material';
import { Search, Warning, CheckCircle, HourglassEmpty } from '@mui/icons-material';
import { useDataStore } from '@/store/useDataStore';
import type { Debt } from '@/types';
import { formatCurrency, calculateDebtProgress } from '@/utils/calculations';
import dayjs from 'dayjs';

export const DebtsPage = () => {
  const { clients, invoices, debts } = useDataStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredDebts = useMemo(() => {
    return debts.filter((debt) => {
      const client = clients.find((c) => c.id === debt.clientId);
      const invoice = invoices.find((i) => i.id === debt.invoiceId);
      const matchesSearch =
        client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice?.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || debt.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [debts, clients, invoices, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const totalDebt = debts.reduce((sum, d) => sum + d.totalAmount, 0);
    const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
    const totalRemaining = debts.reduce((sum, d) => sum + d.remainingAmount, 0);
    const overdueDebts = debts.filter(
      (d) => d.status !== 'paid' && dayjs(d.dueDate).isBefore(dayjs(), 'day')
    );
    const overdueAmount = overdueDebts.reduce((sum, d) => sum + d.remainingAmount, 0);

    return {
      totalDebt,
      totalPaid,
      totalRemaining,
      overdueAmount,
      overdueCount: overdueDebts.length,
      activeCount: debts.filter((d) => d.status !== 'paid').length,
    };
  }, [debts]);

  const getStatusColor = (status: Debt['status']) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'overdue':
        return 'error';
      case 'partially_paid':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: Debt['status']) => {
    switch (status) {
      case 'paid':
        return 'مدفوع';
      case 'overdue':
        return 'متأخر';
      case 'partially_paid':
        return 'مدفوع جزئياً';
      default:
        return 'غير مدفوع';
    }
  };

  const getStatusIcon = (status: Debt['status']) => {
    switch (status) {
      case 'paid':
        return <CheckCircle fontSize="small" />;
      case 'overdue':
        return <Warning fontSize="small" />;
      default:
        return <HourglassEmpty fontSize="small" />;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          الديون
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: 'primary.main' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                إجمالي الديون
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {formatCurrency(stats.totalDebt)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                المبالغ المحصلة
              </Typography>
              <Typography variant="h5" fontWeight={700} color="success.main">
                {formatCurrency(stats.totalPaid)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                المتبقي
              </Typography>
              <Typography variant="h5" fontWeight={700} color="warning.main">
                {formatCurrency(stats.totalRemaining)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: 'error.main' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                المتأخرات
              </Typography>
              <Typography variant="h5" fontWeight={700} color="error.main">
                {formatCurrency(stats.overdueAmount)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.overdueCount} دين متأخر
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="البحث عن دين..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={statusFilter}
                  label="الحالة"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="unpaid">غير مدفوع</MenuItem>
                  <MenuItem value="partially_paid">مدفوع جزئياً</MenuItem>
                  <MenuItem value="paid">مدفوع</MenuItem>
                  <MenuItem value="overdue">متأخر</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>العميل</TableCell>
              <TableCell>رقم الفاتورة</TableCell>
              <TableCell>المبلغ الكلي</TableCell>
              <TableCell>المدفوع</TableCell>
              <TableCell>المتبقي</TableCell>
              <TableCell>التقدم</TableCell>
              <TableCell>تاريخ الاستحقاق</TableCell>
              <TableCell>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDebts.map((debt) => {
              const client = clients.find((c) => c.id === debt.clientId);
              const invoice = invoices.find((i) => i.id === debt.invoiceId);
              const progress = calculateDebtProgress(debt.totalAmount, debt.paidAmount);
              const isOverdue =
                debt.status !== 'paid' && dayjs(debt.dueDate).isBefore(dayjs(), 'day');

              return (
                <TableRow
                  key={debt.id}
                  sx={{
                    bgcolor: isOverdue ? 'error.lighter' : 'inherit',
                  }}
                >
                  <TableCell>
                    <Typography fontWeight={600}>{client?.name}</Typography>
                  </TableCell>
                  <TableCell>{invoice?.invoiceNumber}</TableCell>
                  <TableCell>
                    <Typography fontWeight={600}>
                      {formatCurrency(debt.totalAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography color="success.main" fontWeight={600}>
                      {formatCurrency(debt.paidAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      color={debt.remainingAmount > 0 ? 'error.main' : 'success.main'}
                      fontWeight={600}
                    >
                      {formatCurrency(debt.remainingAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flexGrow: 1, minWidth: 100 }}>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': {
                              bgcolor:
                                progress === 100
                                  ? 'success.main'
                                  : progress > 0
                                  ? 'warning.main'
                                  : 'error.main',
                            },
                          }}
                        />
                      </Box>
                      <Typography variant="caption" fontWeight={600}>
                        {Math.round(progress)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color={isOverdue ? 'error.main' : 'text.primary'}
                      fontWeight={isOverdue ? 600 : 400}
                    >
                      {dayjs(debt.dueDate).format('DD/MM/YYYY')}
                      {isOverdue && (
                        <Box component="span" sx={{ display: 'block', fontSize: '0.75rem' }}>
                          متأخر {dayjs().diff(dayjs(debt.dueDate), 'days')} يوم
                        </Box>
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(isOverdue ? 'overdue' : debt.status)}
                      color={getStatusColor(isOverdue ? 'overdue' : debt.status)}
                      size="small"
                      icon={getStatusIcon(isOverdue ? 'overdue' : debt.status)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredDebts.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            لا توجد ديون
          </Typography>
        </Box>
      )}
    </Box>
  );
};

