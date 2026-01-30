import { useNavigate } from "react-router-dom";
import {
  Box, Container, Card, Typography, Avatar, useTheme, IconButton, Stack, Grid, Button, Paper, Divider
} from "@mui/material";
import {
  People,
  Receipt,
  Payment,
  Brightness4,
  Brightness7,
  Logout,
  TrendingUp,
  CreditCard,
  PieChart,
  Settings,
  Backup,
  Wallet,
  AccountBalance,
  ArrowUpward,
  ArrowDownward
} from "@mui/icons-material";
import { useDataStore } from "@/store/useDataStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { formatCurrency } from "@/utils/calculations";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const HomePageModern = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { payments, clients, expenses, invoices } = useDataStore();
  const { user, logout } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();

  const financialStats = useMemo(() => {
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const balance = totalCollected - totalExpenses;
    
    return { totalCollected, totalInvoiced, totalExpenses, balance };
  }, [payments, invoices, expenses]);

  const chartData = [
    { name: 'الفواتير', value: financialStats.totalInvoiced, color: '#3B82F6' },
    { name: 'المحصل', value: financialStats.totalCollected, color: '#10B981' },
    { name: 'المصاريف', value: financialStats.totalExpenses, color: '#EF4444' },
  ];

  const menuItems = [
    { 
      title: "العملاء", 
      icon: People, 
      path: "/clients", 
      color: "#3B82F6", 
      gradient: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
      subtitle: `${clients.length} عملاء نشطين`
    },
    { 
      title: "الفواتير", 
      icon: Receipt, 
      path: "/invoices", 
      color: "#F59E0B", 
      gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      subtitle: "إدارة الفواتير والعقود"
    },
    { 
      title: "المدفوعات", 
      icon: Payment, 
      path: "/payments", 
      color: "#10B981", 
      gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      subtitle: formatCurrency(financialStats.totalCollected)
    },
    { 
        title: "الإعدادات", 
        icon: Settings, 
        path: "/settings", 
        color: "#6366F1", 
        gradient: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
        subtitle: "المستخدمين والصلاحيات"
      },
      { 
        title: "النسخ الاحتياطي", 
        icon: Backup, 
        path: "/backup", 
        color: "#8B5CF6", 
        gradient: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
        subtitle: "حماية وتصدير البيانات"
      },
  ];

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <Box sx={{ minHeight: "100vh", pb: 6, pt: 3, px: 2, bgcolor: 'background.default', position: 'relative', overflow: 'hidden' }}>
      
      {/* Decorative Blur Backgrounds */}
      <Box sx={{
        position: 'absolute', top: -150, left: '10%', width: 500, height: 500,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
        zIndex: 0
      }} />
      <Box sx={{
        position: 'absolute', bottom: -100, right: '5%', width: 400, height: 400,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
        zIndex: 0
      }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        

        {/* Premium Welcome Hero Section */}
        <Box sx={{ 
            position: 'relative', 
            mb: 6, 
            p: { xs: 4, md: 6 }, 
            borderRadius: 8,
            background: mode === 'dark' 
                ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' 
                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            boxShadow: mode === 'dark' 
                ? '0 20px 50px rgba(0,0,0,0.3)' 
                : '0 20px 50px rgba(59,130,246,0.05)',
            border: '1px solid',
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.1)',
            overflow: 'hidden'
        }}>
            {/* Abstract background for Hero */}
            <Box sx={{
                position: 'absolute', top: -100, right: -100, width: 300, height: 300,
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
                zIndex: 0
            }} />
            
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ 
                    width: { xs: 80, md: 100 }, 
                    height: { xs: 80, md: 100 }, 
                    borderRadius: 5,
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 20px 40px rgba(37, 99, 235, 0.2)',
                    transform: 'rotate(-5deg)',
                    flexShrink: 0
                }}>
                    <AccountBalance sx={{ fontSize: { xs: 40, md: 50 }, color: 'white' }} />
                </Box>
                
                <Stack spacing={1} sx={{ textAlign: { xs: 'center', md: 'right' } }}>
                    <Typography variant="h3" fontWeight={950} sx={{ 
                        background: mode === 'dark' ? 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)' : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 0.5,
                        fontSize: { xs: '2rem', md: '2.8rem' },
                        lineHeight: 1.2
                    }}>
                        مرحباً بكم في منظومة شركة مكين
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, fontSize: '1.05rem', lineHeight: 1.6 }}>
                        نظام إدارة المتكامل لشركة مكين للمقاولات العامة
                    </Typography>
                </Stack>
            </Stack>
        </Box>

        {/* Feature Grid */}
        <Typography variant="h6" fontWeight={900} sx={{ mb: 3 }}>الأقسام الرئيسية</Typography>
        <Grid container spacing={2.5}>
            {menuItems.map((item, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                    <Paper 
                        onClick={() => navigate(item.path)}
                        elevation={0}
                        sx={{ 
                            p: 3, borderRadius: 5, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', spacing: 2,
                            transition: 'all 0.2s',
                            border: '1px solid',
                            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                            '&:hover': {
                                transform: 'translateY(-5px)',
                                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.02)',
                                borderColor: 'primary.main'
                            }
                        }}
                    >
                        <Box sx={{ 
                            width: 60, height: 60, borderRadius: 4, 
                            background: item.gradient, color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 8px 16px ${item.color}30`,
                            marginLeft: 3, // Spacing from text (right side in RTL)
                        }}>
                            <item.icon sx={{ fontSize: 28 }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={800}>{item.title}</Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>{item.subtitle}</Typography>
                        </Box>
                    </Paper>
                </Grid>
            ))}
        </Grid>


      </Container>
    </Box>
  );
};
