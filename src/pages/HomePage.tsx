import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  useTheme,
  alpha,
  IconButton,
  Stack,
  Chip,
} from '@mui/material';
import {
  People,
  Receipt,
  Payment,
  Brightness4,
  Brightness7,
  Logout,
  ChevronLeft,
  Wallet,
} from '@mui/icons-material';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { formatCurrency } from '@/utils/calculations';
import { useMemo } from 'react';

export const HomePage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { payments } = useDataStore();
  const { user, logout } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();

  const stats = useMemo(() => {
    const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);

    return { totalPaid };
  }, [payments]);

  const menuItems = [
    {
      title: 'العملاء',
      icon: People,
      path: '/clients',
      color: '#ec4899',
      bgColor: '#fce7f3',
    },
    {
      title: 'الفواتير',
      icon: Receipt,
      path: '/invoices',
      color: '#3b82f6',
      bgColor: '#dbeafe',
    },
    {
      title: 'المدفوعات',
      icon: Payment,
      path: '/payments',
      color: '#10b981',
      bgColor: '#d1fae5',
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.palette.mode === 'dark' 
          ? '#0f172a'
          : '#f8fafc',
        pb: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          pt: 3,
          pb: 4,
          px: 2,
        }}
      >
        <Container maxWidth="sm">
          {/* Top Bar */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                sx={{
                  width: 45,
                  height: 45,
                  bgcolor: 'rgba(255,255,255,0.25)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                }}
              >
                {user?.displayName?.charAt(0) || user?.email.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
                  مرحباً
                </Typography>
                <Typography variant="body1" sx={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>
                  {user?.displayName || user?.email.split('@')[0]}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <IconButton 
                onClick={toggleTheme} 
                sx={{ 
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                }}
                size="small"
              >
                {mode === 'dark' ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
              </IconButton>
              <IconButton 
                onClick={handleLogout} 
                sx={{ 
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                }}
                size="small"
              >
                <Logout fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          {/* Title */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 900, mb: 0.5 }}>
              DebtFlow Pro
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              إدارة الديون والفواتير
            </Typography>
          </Box>

          {/* Balance Card */}
          <Card
            sx={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 3,
              color: 'white',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ py: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                    إجمالي المدفوعات
                  </Typography>
                  <Typography variant="h5" fontWeight={900}>
                    {formatCurrency(stats.totalPaid)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: 2.5,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Wallet sx={{ fontSize: 28 }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="sm" sx={{ mt: -2 }}>
        {/* Menu Section */}
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2, px: 0.5, mt: 3 }}>
          القوائم الرئيسية
        </Typography>

        <Stack spacing={1.5}>
          {menuItems.map((item, index) => (
            <Card
              key={index}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2.5,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                '&:active': {
                  transform: 'scale(0.98)',
                },
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 50,
                        height: 50,
                        borderRadius: 2,
                        bgcolor: item.bgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <item.icon sx={{ fontSize: 26, color: item.color }} />
                    </Box>
                    <Box>
                      <Typography variant="body1" fontWeight={700}>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        اضغط للدخول
                      </Typography>
                    </Box>
                  </Stack>
                  <ChevronLeft sx={{ color: 'text.secondary' }} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>


        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.6 }}>
          <Typography variant="caption" color="text.secondary">
            DebtFlow Pro © 2024
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
