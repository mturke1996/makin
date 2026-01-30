import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  Chip,
  IconButton,
  Grid,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  PictureAsPdf,
  WhatsApp,
  Visibility,
  CheckCircle,
  Send,
  Schedule,
  Share,
  ReceiptLong,
} from '@mui/icons-material';
import { useDataStore } from '@/store/useDataStore';
import { formatCurrency } from '@/utils/calculations';
import { generateExpenseInvoicePDF, generateExpenseInvoicesSummaryPDF } from '@/utils/pdfGenerator';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import type { ExpenseInvoice } from '@/types';

dayjs.locale('ar');

export const ExpenseInvoicesPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { expenseInvoices, clients, getExpenseInvoices } = useDataStore();
  const [selectedInvoice, setSelectedInvoice] = useState<ExpenseInvoice | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const handleShareTotal = () => {
    generateExpenseInvoicesSummaryPDF(expenseInvoices, clients);
  };

  const invoicesWithClient = useMemo(() => {
    return expenseInvoices.map((invoice) => {
      const client = clients.find((c) => c.id === invoice.clientId);
      return { invoice, client };
    });
  }, [expenseInvoices, clients]);

  const handleViewPDF = (invoice: ExpenseInvoice) => {
    const client = clients.find((c) => c.id === invoice.clientId);
    if (client) {
      generateExpenseInvoicePDF(invoice, client);
    }
  };

  const handleShareWhatsApp = (invoice: ExpenseInvoice) => {
    const client = clients.find((c) => c.id === invoice.clientId);
    if (!client) return;

    const period = `من ${dayjs(invoice.startDate).format('DD/MM/YYYY')} إلى ${dayjs(invoice.endDate).format('DD/MM/YYYY')}`;
    const message = `*فاتورة مصروفات*\n\n` +
      `*العميل:* ${client.name}\n` +
      `*رقم الفاتورة:* ${invoice.invoiceNumber}\n` +
      `*الفترة:* ${period}\n` +
      `*عدد المصروفات:* ${invoice.expenses.length}\n` +
      `*الإجمالي:* ${formatCurrency(invoice.totalAmount)}\n\n` +
      `يرجى مراجعة التفاصيل الكاملة في المرفق.`;

    const whatsappUrl = `https://wa.me/${client.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePreview = (invoice: ExpenseInvoice) => {
    setSelectedInvoice(invoice);
    setPreviewDialogOpen(true);
  };

  const getStatusColor = (status: ExpenseInvoice['status']) => {
    switch (status) {
      case 'paid': return 'success';
      case 'sent': return 'info';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: ExpenseInvoice['status']) => {
    switch (status) {
      case 'paid': return 'مدفوعة';
      case 'sent': return 'مرسلة';
      case 'overdue': return 'متأخرة';
      default: return 'مسودة';
    }
  };

  const getStatusIcon = (status: ExpenseInvoice['status']) => {
    switch (status) {
      case 'paid': return <CheckCircle fontSize="small" />;
      case 'sent': return <Send fontSize="small" />;
      default: return <Schedule fontSize="small" />;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: theme.palette.background.default, pb: 8, position: 'relative' }}>
      {/* Background Ambience */}
      <Box sx={{
         position: 'absolute', top: 0, left: 0, right: 0, height: 300,
         background: theme.palette.mode === 'dark' 
           ? 'linear-gradient(180deg, #1e40af 0%, transparent 100%)' 
           : 'linear-gradient(180deg, #dbeafe 0%, transparent 100%)',
         zIndex: 0, opacity: 0.6
      }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pt: 4 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 6 }}>
          <IconButton 
            onClick={() => navigate(-1)} 
            sx={{ 
                bgcolor: theme.palette.background.paper, 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                '&:hover': { transform: 'translateX(4px)' } 
            }}
          >
            <ArrowBack />
          </IconButton>
          
          <Box flexGrow={1}>
             <Typography variant="h4" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                 <ReceiptLong fontSize="large" color="primary" />
                 فواتير المصروفات
             </Typography>
             <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, opacity: 0.8 }}>
                استعراض وإدارة جميع فواتير المصروفات المجمعة
             </Typography>
          </Box>

          {expenseInvoices.length > 0 && (
            <Button
              variant="contained"
              onClick={handleShareTotal}
              startIcon={<Share />}
              sx={{ 
                  borderRadius: 3, 
                  px: 3, py: 1.5, 
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.5)'
              }}
            >
              مشاركة المجموع
            </Button>
          )}
        </Stack>

      {invoicesWithClient.length === 0 ? (
        <Card sx={{ 
           textAlign: "center", py: 8, 
           borderRadius: 4, bgcolor: 'background.paper', 
           border: '1px dashed', borderColor: 'divider', boxShadow: 'none' 
        }}>
           <Typography variant="h6" color="text.secondary">لا توجد فواتير مصروفات حتى الآن</Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
           {invoicesWithClient
             .sort((a, b) => dayjs(b.invoice.issueDate).diff(dayjs(a.invoice.issueDate)))
             .map(({ invoice, client }) => (
               <Grid size={{ xs: 12, md: 6 }} key={invoice.id}>
                 <Card sx={{ 
                    borderRadius: 4, 
                    border: '1px solid', borderColor: 'divider',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'visible',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }
                 }}>
                    <CardContent sx={{ p: 3 }}>
                       <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Box>
                             <Chip 
                               label={invoice.invoiceNumber} 
                               size="small" 
                               sx={{ 
                                  bgcolor: 'primary.main', color: 'white', 
                                  fontWeight: 800, borderRadius: 1.5, mb: 1, px: 0.5
                               }} 
                             />
                             <Typography variant="h6" fontWeight={800}>{client?.name || 'عميل غير معروف'}</Typography>
                             <Typography variant="caption" color="text.secondary" display="block">
                                {dayjs(invoice.startDate).format('DD/MM/YYYY')} - {dayjs(invoice.endDate).format('DD/MM/YYYY')}
                             </Typography>
                          </Box>
                          <Chip
                             icon={getStatusIcon(invoice.status)}
                             label={getStatusLabel(invoice.status)}
                             color={getStatusColor(invoice.status) as any}
                             size="small"
                             variant="outlined"
                             sx={{ borderRadius: 2, fontWeight: 700 }}
                          />
                       </Stack>
                       
                       <Divider sx={{ borderStyle: 'dashed', mb: 2 }} />
                       
                       <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                             <Typography variant="caption" color="text.secondary">إجمالي الفاتورة</Typography>
                             <Typography variant="h5" fontWeight={900} color="primary.main">
                                {formatCurrency(invoice.totalAmount)}
                             </Typography>
                             <Typography variant="caption" color="text.secondary">
                                {invoice.expenses.length} مصروفات
                             </Typography>
                          </Box>
                          
                          <Stack direction="row" spacing={1}>
                             <IconButton 
                               size="small" color="primary" onClick={() => handlePreview(invoice)}
                               sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: 'white' }, borderRadius: 2 }}
                             >
                                <Visibility fontSize="small" />
                             </IconButton>
                             <IconButton 
                               size="small" color="error" onClick={() => handleViewPDF(invoice)}
                               sx={{ bgcolor: 'error.light', color: 'error.main', '&:hover': { bgcolor: 'error.main', color: 'white' }, borderRadius: 2 }}
                             >
                                <PictureAsPdf fontSize="small" />
                             </IconButton>
                             <IconButton 
                               size="small" color="success" onClick={() => handleShareWhatsApp(invoice)}
                               sx={{ bgcolor: '#dcfce7', color: '#16a34a', '&:hover': { bgcolor: '#16a34a', color: 'white' }, borderRadius: 2 }}
                             >
                                <WhatsApp fontSize="small" />
                             </IconButton>
                          </Stack>
                       </Stack>
                    </CardContent>
                 </Card>
               </Grid>
             ))}
        </Grid>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, overflow: 'hidden' }
        }}
      >
        <Box sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', p: 3, color: 'white' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
             <Typography variant="h6" fontWeight="bold">
               معاينة فاتورة المصروفات
             </Typography>
             <Chip label={selectedInvoice?.invoiceNumber} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 800 }} />
          </Stack>
        </Box>
        <DialogContent dividers sx={{ p: 4 }}>
          {selectedInvoice && (
            <Stack spacing={4}>
              {/* معلومات الفاتورة */}
              <Grid container spacing={2}>
                 <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'action.hover' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>الفترة</Typography>
                        <Typography variant="subtitle1" fontWeight={700}>
                           {dayjs(selectedInvoice.startDate).format('DD/MM/YYYY')} - {' '}
                           {dayjs(selectedInvoice.endDate).format('DD/MM/YYYY')}
                        </Typography>
                    </Box>
                 </Grid>
              </Grid>

              {/* جدول المصروفات */}
              <Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                   <ReceiptLong color="action" />
                   تفاصيل المصروفات ({selectedInvoice.expenses.length})
                </Typography>
                <Stack spacing={1.5}>
                   {selectedInvoice.expenses
                        .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
                        .map((expense) => (
                          <Card key={expense.id} sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                             <CardContent sx={{ p: 2, '&:last-child': { p: 2 } }}>
                                <Grid container alignItems="center" spacing={2}>
                                   <Grid size={{ xs: 12, md: 2 }}>
                                      <Typography variant="caption" color="text.secondary" display="block">التاريخ</Typography>
                                      <Typography variant="body2" fontWeight={600}>{dayjs(expense.date).format('DD/MM/YYYY')}</Typography>
                                   </Grid>
                                   <Grid size={{ xs: 12, md: 6 }}>
                                       <Typography variant="body2" fontWeight={700}>{expense.description}</Typography>
                                       {expense.notes && <Typography variant="caption" color="text.secondary">{expense.notes}</Typography>}
                                   </Grid>
                                   <Grid size={{ xs: 6, md: 2 }}>
                                       <Chip label={expense.category} size="small" variant="outlined" />
                                   </Grid>
                                   <Grid size={{ xs: 6, md: 2 }} sx={{ textAlign: 'right' }}>
                                       <Typography variant="body1" fontWeight={800} color="primary.main">{formatCurrency(expense.amount)}</Typography>
                                   </Grid>
                                </Grid>
                             </CardContent>
                          </Card>
                    ))}
                </Stack>
                
                <Box sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: '#f0fdf4', border: '1px dashed #16a34a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <Typography variant="h6" fontWeight={700} color="#15803d">الإجمالي الكلي</Typography>
                     <Typography variant="h4" fontWeight={900} color="#15803d">{formatCurrency(selectedInvoice.totalAmount)}</Typography>
                </Box>
              </Box>

              {selectedInvoice.notes && (
                <Box sx={{ p: 2, bgcolor: '#fefce8', borderRadius: 2, border: '1px solid #fde047' }}>
                  <Typography variant="subtitle2" color="#854d0e" gutterBottom>
                    ملاحظات
                  </Typography>
                  <Typography variant="body2" color="#854d0e">{selectedInvoice.notes}</Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setPreviewDialogOpen(false)} size="large" sx={{ borderRadius: 2 }}>إغلاق</Button>
          {selectedInvoice && (
            <Button
              variant="contained"
              startIcon={<PictureAsPdf />}
              size="large"
              sx={{ borderRadius: 2, px: 3, bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}
              onClick={() => {
                const client = clients.find((c) => c.id === selectedInvoice.clientId);
                if (client) {
                  generateExpenseInvoicePDF(selectedInvoice, client);
                }
                setPreviewDialogOpen(false);
              }}
            >
              تصدير PDF
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
    </Box>
  );
};

