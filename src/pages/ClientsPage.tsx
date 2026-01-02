import { useState, useMemo } from 'react';
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
  Avatar,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Delete,
  Business,
  Person,
  ChevronLeft,
  ArrowBack,
  People,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '@/store/useDataStore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Client } from '@/types';
import { formatCurrency } from '@/utils/calculations';
import { AccountBalance, Phone, Email, LocationOn } from '@mui/icons-material';

const clientSchema = z.object({
  name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  phone: z.string().min(10, 'رقم الهاتف غير صحيح'),
  address: z.string().min(5, 'العنوان يجب أن يكون 5 أحرف على الأقل'),
  type: z.enum(['company', 'individual']),
});

type ClientFormData = z.infer<typeof clientSchema>;

export const ClientsPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { clients, expenses, standaloneDebts, payments, addClient, updateClient, deleteClient } = useDataStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      type: 'individual',
    },
  });

  const filteredClients = useMemo(() => {
    return clients.filter((client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery)
    );
  }, [clients, searchQuery]);

  const getClientRemainingBalance = (clientId: string) => {
    const clientExpenses = expenses.filter((exp) => exp.clientId === clientId);
    const clientDebts = standaloneDebts.filter((debt) => debt.clientId === clientId);
    const clientPayments = payments.filter((pay) => pay.clientId === clientId);
    
    const totalExpenses = clientExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalDebts = clientDebts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
    const totalPaid = clientPayments.reduce((sum, pay) => sum + pay.amount, 0);
    
    const remainingBalance = totalExpenses + totalDebts - totalPaid;
    
    return remainingBalance;
  };

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      reset({
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        type: client.type,
      });
    } else {
      setEditingClient(null);
      reset({
        name: '',
        email: '',
        phone: '',
        address: '',
        type: 'individual',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingClient(null);
    reset();
  };

  const onSubmit = (data: ClientFormData) => {
    if (editingClient) {
      updateClient(editingClient.id, data);
    } else {
      const newClient: Client = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addClient(newClient);
    }
    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العميل؟')) {
      deleteClient(id);
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
          background: theme.palette.mode === 'light' 
            ? 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)'
            : 'linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)',
          pt: 3,
          pb: 4,
          px: 2,
          borderRadius: '0 0 32px 32px',
          boxShadow: '0 8px 32px rgba(25, 118, 210, 0.25)',
        }}
      >
        <Container maxWidth="sm">
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <IconButton onClick={() => navigate('/')} sx={{ color: 'white', marginLeft: '8px' }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" fontWeight={800} sx={{ color: 'white', flexGrow: 1 }}>
              العملاء ({clients.length})
            </Typography>
            <Button
              variant="contained"
              onClick={() => handleOpenDialog()}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                fontWeight: 700,
                '&:hover': { 
                  bgcolor: 'rgba(255,255,255,0.95)',
                  transform: 'scale(1.05)',
                },
                borderRadius: 2.5,
                px: 2.5,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transition: 'all 0.2s',
              }}
              startIcon={<Add />}
            >
              جديد
            </Button>
          </Stack>

          {/* Search */}
          <TextField
            fullWidth
            placeholder="ابحث عن عميل بالاسم أو الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              mt: 2.5,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'white',
                borderRadius: 3,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                '& fieldset': { border: 'none' },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
        </Container>
      </Box>

      {/* Clients List */}
      <Container maxWidth="sm" sx={{ mt: -2 }}>
        <Stack spacing={3.5}>
          {filteredClients.length === 0 ? (
            <Card sx={{ borderRadius: 2.5, textAlign: 'center', py: 6, bgcolor: 'background.paper' }}>
              <People sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                لا يوجد عملاء
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
                sx={{ mt: 2, borderRadius: 2 }}
              >
                إضافة أول عميل
              </Button>
            </Card>
          ) : (
            filteredClients.map((client) => {
              const remainingBalance = getClientRemainingBalance(client.id);
              const hasDebt = remainingBalance > 0;
              
              return (
                <Card
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  sx={{
                    borderRadius: 3,
                    boxShadow: theme.palette.mode === 'light'
                      ? '0 4px 20px rgba(0,0,0,0.08)'
                      : '0 4px 20px rgba(0,0,0,0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    bgcolor: 'background.paper',
                    border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    '&:hover': {
                      boxShadow: theme.palette.mode === 'light'
                        ? '0 12px 40px rgba(0,0,0,0.15)'
                        : '0 12px 40px rgba(0,0,0,0.5)',
                      transform: 'translateY(-4px) scale(1.01)',
                    },
                    '&:active': {
                      transform: 'scale(0.98)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={0}>
                      {/* Avatar */}
                      <Avatar
                        sx={{
                          width: 52,
                          height: 52,
                          bgcolor: client.type === 'company' ? 'primary.light' : 'secondary.light',
                          flexShrink: 0,
                          marginLeft: '24px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                      >
                        {client.type === 'company' ? (
                          <Business sx={{ color: 'primary.main', fontSize: 20 }} />
                        ) : (
                          <Person sx={{ color: 'secondary.main', fontSize: 20 }} />
                        )}
                      </Avatar>

                      {/* Client Info */}
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {client.name}
                          </Typography>
                          <Chip
                            label={client.type === 'company' ? 'شركة' : 'فرد'}
                            size="small"
                            color={client.type === 'company' ? 'primary' : 'secondary'}
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        </Stack>
                        
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                          {client.phone}
                        </Typography>

                        {/* Remaining Balance */}
                        <Stack direction="row" alignItems="center" spacing={0} sx={{ mt: 1 }}>
                          <AccountBalance 
                            sx={{ 
                              color: hasDebt ? 'error.main' : 'success.main',
                              fontSize: 18,
                              marginLeft: '16px',
                              flexShrink: 0,
                            }} 
                          />
                          <Typography 
                            variant="body1" 
                            fontWeight={800}
                            color={hasDebt ? 'error.main' : 'success.main'}
                          >
                            {formatCurrency(Math.abs(remainingBalance))}
                          </Typography>
                        </Stack>
                      </Box>

                      {/* Actions */}
                      <Stack direction="row" spacing={1.5} sx={{ marginLeft: '16px', flexShrink: 0 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(client);
                          }}
                          sx={{
                            bgcolor: 'primary.light',
                            color: 'primary.main',
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            boxShadow: '0 2px 8px rgba(25, 118, 210, 0.2)',
                            '&:hover': { 
                              bgcolor: 'primary.main', 
                              color: 'white',
                              transform: 'scale(1.05)',
                            },
                            transition: 'all 0.2s',
                          }}
                        >
                          <Edit sx={{ fontSize: 20 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(client.id);
                          }}
                          sx={{
                            bgcolor: 'error.light',
                            color: 'error.main',
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            boxShadow: '0 2px 8px rgba(211, 47, 47, 0.2)',
                            '&:hover': { 
                              bgcolor: 'error.main', 
                              color: 'white',
                              transform: 'scale(1.05)',
                            },
                            transition: 'all 0.2s',
                          }}
                        >
                          <Delete sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Stack>
                    </Stack>
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
                ? 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)'
                : 'linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)',
              color: 'white',
              p: 2,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton onClick={handleCloseDialog} sx={{ color: 'white' }}>
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                {editingClient ? 'تعديل عميل' : 'إضافة عميل جديد'}
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ p: 3.5 }}>
            <Stack spacing={3}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="الاسم"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />

              <Controller
                name="type"
                control={control}
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
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="رقم الهاتف"
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />

              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="البريد الإلكتروني"
                    type="email"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />

              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="العنوان"
                    multiline
                    rows={3}
                    error={!!errors.address}
                    helperText={errors.address?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mt: 5 }}>
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
                fullWidth
                size="large"
                sx={{ borderRadius: 2, py: 1.5 }}
              >
                {editingClient ? 'حفظ التعديلات' : 'إضافة العميل'}
              </Button>
            </Stack>
          </Box>
        </form>
      </Dialog>
    </Box>
  );
};
