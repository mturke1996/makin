import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
} from '@mui/material';
import {
  CloudDownload,
  Description,
  People,
  Receipt,
  Backup,
  CheckCircle,
} from '@mui/icons-material';
import { useDataStore } from '@/store/useDataStore';
import { exportToExcel } from '@/utils/excelExport';
import toast from 'react-hot-toast';

interface BackupDialogProps {
  open: boolean;
  onClose: () => void;
}

export const BackupDialog = ({ open, onClose }: BackupDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { clients, invoices, payments, expenses } = useDataStore();

  const handleBackup = async (type: 'full' | 'clients' | 'invoices') => {
    setLoading(true);
    try {
      switch (type) {
        case 'full':
          await exportToExcel.fullBackup({ clients, invoices, payments, expenses });
          toast.success('تم تحميل النسخة الاحتياطية بنجاح');
          break;
        case 'clients':
          exportToExcel.clients(clients);
          toast.success('تم تصدير قائمة العملاء بنجاح');
          break;
        case 'invoices':
          exportToExcel.invoices(invoices, clients);
          toast.success('تم تصدير قائمة الفواتير بنجاح');
          break;
      }
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('حدث خطأ أثناء النسخ الاحتياطي');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '24px' } }}>
      <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Backup color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              النسخ الاحتياطي والبيانات
            </Typography>
            <Typography variant="body2" color="text.secondary">
              تصدير بيانات شركة مكين وملفات Excel
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 3 }}>
        <Alert severity="info" sx={{ mb: 3, borderRadius: '12px' }}>
          يمكنك تحميل نسخة كاملة من قاعدة البيانات أو اختيار جداول محددة للتصدير بصيغة Excel.
        </Alert>

        <List>
          <ListItem
            component="button"
            onClick={() => handleBackup('full')}
            disabled={loading}
            sx={{
              mb: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '16px',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: 'primary.main',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <ListItemIcon>
              <CloudDownload color="primary" sx={{ fontSize: 28 }} />
            </ListItemIcon>
            <ListItemText
              primary="نسخة احتياطية كاملة"
              secondary="تحميل كل البيانات (العملاء، الفواتير، المدفوعات، المصروفات)"
              primaryTypographyProps={{ fontWeight: 'bold' }}
            />
            {loading && <CircularProgress size={20} />}
          </ListItem>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <ListItem
              component="button"
              onClick={() => handleBackup('clients')}
              disabled={loading}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '16px',
                textAlign: 'center',
                flexDirection: 'column',
                alignItems: 'center',
                py: 3,
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'secondary.main',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <People color="secondary" sx={{ fontSize: 32, mb: 1 }} />
              <Typography fontWeight="bold">العملاء</Typography>
              <Typography variant="caption" color="text.secondary">ملف Excel</Typography>
            </ListItem>

            <ListItem
              component="button"
              onClick={() => handleBackup('invoices')}
              disabled={loading}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '16px',
                textAlign: 'center',
                flexDirection: 'column',
                alignItems: 'center',
                py: 3,
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'success.main',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Receipt color="success" sx={{ fontSize: 32, mb: 1 }} />
              <Typography fontWeight="bold">الفواتير</Typography>
              <Typography variant="caption" color="text.secondary">ملف Excel</Typography>
            </ListItem>
          </Box>
        </List>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} size="large" variant="outlined" color="inherit">
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};
