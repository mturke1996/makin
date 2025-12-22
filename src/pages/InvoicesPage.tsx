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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Container,
  Stack,
  useTheme,
  Divider,
} from '@mui/material';
import {
  Add,
  Search,
  ArrowBack,
  PictureAsPdf,
  Receipt,
  Visibility,
  WhatsApp,
} from '@mui/icons-material';
import { useDataStore } from '@/store/useDataStore';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import type { Invoice, InvoiceItem } from '@/types';
import { formatCurrency } from '@/utils/calculations';
import { generateInvoicePDF } from '@/utils/pdfGenerator';
import { generateInvoiceWhatsApp } from '@/utils/invoiceWhatsApp';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';

dayjs.locale('ar');

export const InvoicesPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { clients, invoices, addInvoice } = useDataStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
  } = useForm({
    defaultValues: {
      clientId: '',
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
      taxRate: 0,
      notes: '',
      dueDate: dayjs().add(30, 'days').format('YYYY-MM-DD'),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchItems = watch('items');
  const watchTaxRate = watch('taxRate');

  const calculatedTotal = useMemo(() => {
    const subtotal = watchItems.reduce(
      (sum: number, item: any) => sum + (item.quantity || 0) * (item.unitPrice || 0),
      0
    );
    const taxAmount = subtotal * ((watchTaxRate || 0) / 100);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  }, [watchItems, watchTaxRate]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const client = clients.find((c) => c.id === invoice.clientId);
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)));
  }, [invoices, clients, searchQuery, statusFilter]);

  const handleOpenDialog = () => {
    reset({
      clientId: '',
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
      taxRate: 0,
      notes: '',
      dueDate: dayjs().add(30, 'days').format('YYYY-MM-DD'),
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      const items: InvoiceItem[] = data.items.map((item: any) => ({
        id: crypto.randomUUID(),
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      }));

      const { subtotal, taxAmount, total } = calculatedTotal;

      const newInvoice: Invoice = {
        id: crypto.randomUUID(),
        invoiceNumber: `INV-${Date.now()}`,
        clientId: data.clientId,
        items,
        subtotal,
        taxRate: data.taxRate,
        taxAmount,
        total,
        status: 'draft',
        issueDate: new Date().toISOString(),
        dueDate: data.dueDate,
        notes: data.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await addInvoice(newInvoice);
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving invoice:', error);
    }
  };

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
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
              الفواتير
            </Typography>
            <Button
              variant="contained"
              onClick={handleOpenDialog}
              sx={{
                bgcolor: 'white',
                color: '#3b82f6',
                fontWeight: 700,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                borderRadius: 2,
              }}
              startIcon={<Add />}
            >
              جديدة
            </Button>
          </Stack>

          {/* Search & Filter */}
          <Stack spacing={1.5}>
            <TextField
              fullWidth
              placeholder="ابحث عن فاتورة..."
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{
                  bgcolor: 'white',
                  borderRadius: 2,
                  '& fieldset': { border: 'none' },
                }}
              >
                <MenuItem value="all">كل الفواتير</MenuItem>
                <MenuItem value="draft">مسودة</MenuItem>
                <MenuItem value="sent">مرسلة</MenuItem>
                <MenuItem value="paid">مدفوعة</MenuItem>
                <MenuItem value="overdue">متأخرة</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Container>
      </Box>

      {/* Invoices List */}
      <Container maxWidth="sm" sx={{ mt: -1 }}>
        <Stack spacing={1.5}>
          {filteredInvoices.length === 0 ? (
            <Card sx={{ borderRadius: 2.5, textAlign: 'center', py: 6 }}>
              <Receipt sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                لا توجد فواتير
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleOpenDialog}
              >
                إنشاء أول فاتورة
              </Button>
            </Card>
          ) : (
            filteredInvoices.map((invoice) => {
              const client = clients.find((c) => c.id === invoice.clientId);
              return (
                <Card
                  key={invoice.id}
                  sx={{
                    borderRadius: 2.5,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                      <Box>
                        <Typography variant="body1" fontWeight={700}>
                          {invoice.invoiceNumber}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {client?.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {dayjs(invoice.issueDate).format('DD MMM YYYY')}
                        </Typography>
                      </Box>
                      <Stack alignItems="flex-end" spacing={0.5}>
                        <Typography variant="h6" fontWeight={800} color="primary">
                          {formatCurrency(invoice.total)}
                        </Typography>
                        <Chip
                          label={
                            invoice.status === 'paid' ? 'مدفوعة' :
                            invoice.status === 'overdue' ? 'متأخرة' :
                            invoice.status === 'partially_paid' ? 'جزئية' : 'نشطة'
                          }
                          size="small"
                          color={
                            invoice.status === 'paid' ? 'success' :
                            invoice.status === 'overdue' ? 'error' : 'default'
                          }
                          sx={{ height: 22, fontSize: '0.7rem' }}
                        />
                      </Stack>
                    </Stack>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                      العناصر:
                    </Typography>
                    <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                      {invoice.items.slice(0, 2).map((item) => (
                        <Stack key={item.id} direction="row" justifyContent="space-between">
                          <Typography variant="caption">
                            • {item.description} ({item.quantity})
                          </Typography>
                          <Typography variant="caption" fontWeight={600}>
                            {formatCurrency(item.total)}
                          </Typography>
                        </Stack>
                      ))}
                      {invoice.items.length > 2 && (
                        <Typography variant="caption" color="text.secondary">
                          + {invoice.items.length - 2} عنصر آخر
                        </Typography>
                      )}
                    </Stack>

                    {/* Action Buttons */}
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInvoice(invoice);
                          setPreviewDialogOpen(true);
                        }}
                        sx={{ flexGrow: 1, borderRadius: 1.5 }}
                      >
                        معاينة
                      </Button>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (client) {
                            generateInvoicePDF(invoice, client);
                          }
                        }}
                        sx={{ borderRadius: 1.5 }}
                      >
                        <PictureAsPdf fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (client) {
                            generateInvoiceWhatsApp(invoice, client);
                          }
                        }}
                        sx={{ borderRadius: 1.5 }}
                      >
                        <WhatsApp fontSize="small" />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Stack>
      </Container>

      {/* Create Invoice Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullScreen
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box
            sx={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              p: 2,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton onClick={() => setDialogOpen(false)} sx={{ color: 'white' }}>
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                إنشاء فاتورة
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ p: 2 }}>
            <Stack spacing={2.5}>
              {/* Client Selection */}
              <Controller
                name="clientId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>العميل</InputLabel>
                    <Select {...field} label="العميل" sx={{ borderRadius: 2 }}>
                      {clients.map((client) => (
                        <MenuItem key={client.id} value={client.id}>
                          {client.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />

              {/* Items */}
              <Typography variant="subtitle1" fontWeight={700}>
                العناصر
              </Typography>
              
              {fields.map((field, index) => (
                <Card key={field.id} sx={{ borderRadius: 2, bgcolor: 'action.hover' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <Controller
                        name={`items.${index}.description`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="الوصف"
                            placeholder="مثال: أعمال بناء"
                            size="small"
                          />
                        )}
                      />
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Controller
                            name={`items.${index}.quantity`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="الكمية"
                                type="number"
                                size="small"
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                              />
                            )}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <Controller
                            name={`items.${index}.unitPrice`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="السعر"
                                type="number"
                                size="small"
                                placeholder="1000"
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            )}
                          />
                        </Grid>
                      </Grid>
                      {fields.length > 1 && (
                        <Button
                          color="error"
                          size="small"
                          onClick={() => remove(index)}
                        >
                          حذف
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}

              <Button
                startIcon={<Add />}
                onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                fullWidth
                variant="outlined"
                sx={{ borderRadius: 2 }}
              >
                إضافة عنصر
              </Button>

              {/* Tax and Due Date */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Controller
                    name="taxRate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="الضريبة %"
                        type="number"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Controller
                    name="dueDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="الاستحقاق"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              {/* Notes */}
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="ملاحظات"
                    multiline
                    rows={2}
                  />
                )}
              />

              {/* Total Summary */}
              <Card sx={{ borderRadius: 2, bgcolor: 'primary.main', color: 'white' }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        المجموع:
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {formatCurrency(calculatedTotal.subtotal)}
                      </Typography>
                    </Stack>
                    {calculatedTotal.taxAmount > 0 && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          الضريبة:
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {formatCurrency(calculatedTotal.taxAmount)}
                        </Typography>
                      </Stack>
                    )}
                    <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="h6" fontWeight={800}>
                        الإجمالي:
                      </Typography>
                      <Typography variant="h6" fontWeight={900}>
                        {formatCurrency(calculatedTotal.total)}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              {/* Buttons */}
              <Stack direction="row" spacing={2}>
                <Button
                  onClick={() => setDialogOpen(false)}
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
                  إنشاء
                </Button>
              </Stack>
            </Stack>
          </Box>
        </form>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        fullScreen
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: theme.palette.mode === 'dark' ? '#1e293b' : '#fff',
          },
        }}
      >
        {selectedInvoice && (() => {
          const previewClient = clients.find((c) => c.id === selectedInvoice.clientId);
          if (!previewClient) return null;
          
          return (
            <>
              <Box
                sx={{
                  background: theme.palette.mode === 'light' 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    : 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                  color: 'white',
                  p: 2,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <IconButton onClick={() => setPreviewDialogOpen(false)} sx={{ color: 'white' }}>
                    <ArrowBack />
                  </IconButton>
                  <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
                    معاينة الفاتورة
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PictureAsPdf />}
                    onClick={() => generateInvoicePDF(selectedInvoice, previewClient)}
                    sx={{
                      bgcolor: 'white',
                      color: 'primary.main',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                      mr: 1,
                    }}
                  >
                    PDF
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<WhatsApp />}
                    onClick={() => generateInvoiceWhatsApp(selectedInvoice, previewClient)}
                    sx={{
                      bgcolor: 'success.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'success.dark' },
                    }}
                  >
                    واتساب
                  </Button>
                </Stack>
              </Box>

              <Box sx={{ p: 2, overflow: 'auto' }}>
                <Card sx={{ borderRadius: 2.5, mb: 2 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          رقم الفاتورة
                        </Typography>
                        <Typography variant="h6" fontWeight={800}>
                          {selectedInvoice.invoiceNumber}
                        </Typography>
                      </Box>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            العميل
                          </Typography>
                          <Typography variant="body1" fontWeight={700}>
                            {previewClient.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {previewClient.phone}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            تاريخ الإصدار
                          </Typography>
                          <Typography variant="body1">
                            {dayjs(selectedInvoice.issueDate).format('DD/MM/YYYY')}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            تاريخ الاستحقاق
                          </Typography>
                          <Typography variant="body1">
                            {dayjs(selectedInvoice.dueDate).format('DD/MM/YYYY')}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            الحالة
                          </Typography>
                          <Chip
                            label={
                              selectedInvoice.status === 'paid' ? 'مدفوعة' :
                              selectedInvoice.status === 'overdue' ? 'متأخرة' :
                              selectedInvoice.status === 'partially_paid' ? 'جزئية' : 'نشطة'
                            }
                            color={
                              selectedInvoice.status === 'paid' ? 'success' :
                              selectedInvoice.status === 'overdue' ? 'error' : 'default'
                            }
                            size="small"
                          />
                        </Grid>
                      </Grid>

                      <Divider />

                      <Box>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                          البنود ({selectedInvoice.items.length})
                        </Typography>
                        <Stack spacing={1}>
                          {selectedInvoice.items.map((item) => (
                            <Card key={item.id} variant="outlined" sx={{ borderRadius: 1.5 }}>
                              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                  <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="body2" fontWeight={700}>
                                      {item.description}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      الكمية: {item.quantity} × {formatCurrency(item.unitPrice)}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body1" fontWeight={800} color="primary.main">
                                    {formatCurrency(item.total)}
                                  </Typography>
                                </Stack>
                              </CardContent>
                            </Card>
                          ))}
                        </Stack>
                      </Box>

                      <Divider />

                      <Box>
                        <Stack spacing={1}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              المجموع الفرعي:
                            </Typography>
                            <Typography variant="body2" fontWeight={700}>
                              {formatCurrency(selectedInvoice.subtotal)}
                            </Typography>
                          </Stack>
                          {selectedInvoice.taxAmount > 0 && (
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">
                                الضريبة ({selectedInvoice.taxRate}%):
                              </Typography>
                              <Typography variant="body2" fontWeight={700}>
                                {formatCurrency(selectedInvoice.taxAmount)}
                              </Typography>
                            </Stack>
                          )}
                          <Divider />
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="h6" fontWeight={800}>
                              الإجمالي:
                            </Typography>
                            <Typography variant="h6" fontWeight={900} color="primary.main">
                              {formatCurrency(selectedInvoice.total)}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Box>

                      {selectedInvoice.notes && (
                        <>
                          <Divider />
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              ملاحظات
                            </Typography>
                            <Typography variant="body2">
                              {selectedInvoice.notes}
                            </Typography>
                          </Box>
                        </>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
};
