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
  Business,
  Person,
  ChevronLeft,
  ArrowBack,
  People,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
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
  const user = useAuthStore((state) => state.user);
  const { clients, expenses, standaloneDebts, payments, addClient, updateClient } = useDataStore();
  
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
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, #0f172a 0%, #000000 100%)'
            : 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
          pt: 3,
          pb: 6,
          px: 2,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          boxShadow: theme.palette.mode === 'dark' 
             ? '0 10px 40px -10px rgba(0,0,0,0.5)'
             : '0 10px 40px -10px rgba(59, 130, 246, 0.1)',
          position: 'relative',
          overflow: 'hidden',
          mb: 3
        }}
      >
        {/* Abstract Background Shapes */}

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
             <Stack direction="row" alignItems="center" spacing={2}>
                <IconButton onClick={() => navigate('/')} 
                  sx={{ 
                     bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'white',
                     backdropFilter: 'blur(10px)',
                     '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'white' }
                  }}>
                  <ArrowBack />
                </IconButton>
                <Box>
                   <Typography variant="h5" fontWeight={800} color="text.primary">
                     العملاء
                   </Typography>
                   <Typography variant="body2" color="text.secondary" fontWeight={600}>
                     {clients.length} عميل نشط
                   </Typography>
                </Box>
             </Stack>
             
             <Button
              variant="contained"
              onClick={() => handleOpenDialog()}
              startIcon={<Add />}
              sx={{
                borderRadius: 50,
                px: 3, py: 1,
                background: theme.palette.primary.gradient,
                boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
                textTransform: 'none',
              }}
            >
              عميل جديد
            </Button>
          </Stack>

          {/* Search Bar - Glassmorphism */}
          <TextField
            fullWidth
            placeholder="ابحث عن عميل بالاسم أو الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: theme.palette.background.glass,
                backdropFilter: 'blur(12px)',
                borderRadius: 4,
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)'}`,
                transition: 'all 0.2s',
                '&.Mui-focused': {
                   boxShadow: '0 8px 30px rgba(37, 99, 235, 0.15)',
                   borderColor: theme.palette.primary.main
                },
                '& fieldset': { border: 'none' },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: theme.palette.primary.main }} />
                </InputAdornment>
              ),
            }}
          />
        </Container>
      </Box>

      {/* Clients List */}
      <Container maxWidth="md">
        <Stack spacing={2}>
          {filteredClients.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
               <Box sx={{ 
                  width: 120, height: 120, borderRadius: '50%', 
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  mx: 'auto', mb: 3
               }}>
                  <People sx={{ fontSize: 60, opacity: 0.3 }} />
               </Box>
              <Typography variant="h6" color="text.secondary" fontWeight={700}>
                لا يوجد عملاء
              </Typography>
            </Box>
          ) : (
            filteredClients.map((client) => {
              return (
                <Card
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  sx={{
                    borderRadius: 4,
                    // Use theme-defined glassmorphism or fallback
                    background: theme.palette.background.paper,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: '1px solid transparent',
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      borderColor: theme.palette.primary.main,
                      boxShadow: '0 10px 30px -5px rgba(37, 99, 235, 0.15)'
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
                        <Stack 
                          direction={{ xs: 'column', sm: 'row' }} 
                          spacing={{ xs: 1, sm: 2 }} 
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                          sx={{ mb: 1.5 }}
                        >
                          <Typography 
                            variant="h6" 
                            fontWeight={800}
                            sx={{
                              fontSize: { xs: '1rem', sm: '1.25rem' },
                              wordBreak: 'break-word',
                            }}
                          >
                            {client.name}
                          </Typography>
                          <Chip
                            label={client.type === 'company' ? 'شركة' : 'فرد'}
                            size="small"
                            color={client.type === 'company' ? 'primary' : 'secondary'}
                            variant="outlined"
                            sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}
                          />
                        </Stack>
                        
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{
                            bgcolor: theme.palette.mode === 'dark' 
                              ? 'rgba(255,255,255,0.05)' 
                              : 'rgba(0,0,0,0.03)',
                            px: 1.5,
                            py: 0.75,
                            borderRadius: 2,
                            mt: 1,
                          }}
                        >
                          <Phone sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.8 }} />
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              fontWeight: 600,
                              fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                            }}
                          >
                            {client.phone}
                          </Typography>
                        </Stack>
                      </Box>

                      {/* Actions */}
                      <Stack direction="row" spacing={{ xs: 2.5, sm: 3 }} sx={{ marginLeft: '16px', flexShrink: 0 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(client);
                          }}
                          sx={{
                            bgcolor: 'white',
                            color: 'primary.main',
                            width: { xs: 44, sm: 40 },
                            height: { xs: 44, sm: 40 },
                            borderRadius: 2,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            border: '1px solid rgba(0,0,0,0.1)',
                            '&:hover': { 
                              bgcolor: 'rgba(255,255,255,0.95)',
                              transform: 'scale(1.05)',
                            },
                            '&:active': {
                              transform: 'scale(0.95)',
                            },
                            transition: 'all 0.2s ease-in-out',
                          }}
                        >
                          <Edit sx={{ fontSize: { xs: 20, sm: 18 } }} />
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
