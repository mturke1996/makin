import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ar';
import type { Expense } from '@/types';
import { formatCurrency } from '@/utils/calculations';

dayjs.locale('ar');

interface CloseExpensesDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (expenseIds: string[], startDate: string, endDate: string, notes?: string) => Promise<void>;
  expenses: Expense[];
  clientName: string;
}

export const CloseExpensesDialog = ({
  open,
  onClose,
  onConfirm,
  expenses,
  clientName,
}: CloseExpensesDialogProps) => {
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter expenses by date range and not closed
  const availableExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const expDate = dayjs(exp.date);
      const isInRange =
        (!startDate || expDate.isAfter(startDate.subtract(1, 'day'))) &&
        (!endDate || expDate.isBefore(endDate.add(1, 'day')));
      return !exp.isClosed && isInRange;
    });
  }, [expenses, startDate, endDate]);

  // Select all available expenses
  const handleSelectAll = () => {
    if (selectedExpenseIds.size === availableExpenses.length) {
      setSelectedExpenseIds(new Set());
    } else {
      setSelectedExpenseIds(new Set(availableExpenses.map((e) => e.id)));
    }
  };

  const handleToggleExpense = (expenseId: string) => {
    const newSet = new Set(selectedExpenseIds);
    if (newSet.has(expenseId)) {
      newSet.delete(expenseId);
    } else {
      newSet.add(expenseId);
    }
    setSelectedExpenseIds(newSet);
  };

  const handleSubmit = async () => {
    if (selectedExpenseIds.size === 0) {
      setError('يرجى اختيار مصروف واحد على الأقل');
      return;
    }

    if (!startDate || !endDate) {
      setError('يرجى تحديد تاريخ البداية والنهاية');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(
        Array.from(selectedExpenseIds),
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD'),
        notes || undefined
      );
      // Reset form
      setSelectedExpenseIds(new Set());
      setNotes('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إغلاق المصروفات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = availableExpenses
    .filter((e) => selectedExpenseIds.has(e.id))
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight="bold">
          إغلاق المصروفات وإنشاء فاتورة
        </Typography>
        <Typography variant="body2" color="text.secondary">
          العميل: {clientName}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              الفترة الزمنية
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ar">
              <Stack direction="row" spacing={2}>
                <DatePicker
                  label="من تاريخ"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  format="YYYY-MM-DD"
                  slotProps={{ textField: { fullWidth: true } }}
                />
                <DatePicker
                  label="إلى تاريخ"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  format="YYYY-MM-DD"
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Stack>
            </LocalizationProvider>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2">
                المصروفات المتاحة ({availableExpenses.length})
              </Typography>
              <Button size="small" onClick={handleSelectAll}>
                {selectedExpenseIds.size === availableExpenses.length ? 'إلغاء الكل' : 'تحديد الكل'}
              </Button>
            </Box>

            {availableExpenses.length === 0 ? (
              <Alert severity="info">لا توجد مصروفات متاحة في هذه الفترة</Alert>
            ) : (
              <Box
                sx={{
                  maxHeight: 300,
                  overflowY: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 1,
                }}
              >
                {availableExpenses.map((expense) => (
                  <FormControlLabel
                    key={expense.id}
                    control={
                      <Checkbox
                        checked={selectedExpenseIds.has(expense.id)}
                        onChange={() => handleToggleExpense(expense.id)}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mr: 1 }}>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {expense.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(expense.date).format('YYYY-MM-DD')} • {expense.category}
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          {formatCurrency(expense.amount)}
                        </Typography>
                      </Box>
                    }
                    sx={{ width: '100%', m: 0, mb: 1 }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {selectedExpenseIds.size > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                ملخص
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`عدد المصروفات: ${selectedExpenseIds.size}`} color="primary" variant="outlined" />
                <Chip label={`الإجمالي: ${formatCurrency(totalAmount)}`} color="success" variant="outlined" />
              </Box>
            </Box>
          )}

          <TextField
            label="ملاحظات (اختياري)"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          إلغاء
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting || selectedExpenseIds.size === 0}
        >
          {isSubmitting ? 'جاري الإنشاء...' : 'إغلاق وإنشاء فاتورة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

