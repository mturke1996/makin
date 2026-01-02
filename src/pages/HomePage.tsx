import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  useTheme,
  IconButton,
  Stack,
  Fab,
  Chip,
} from "@mui/material";
import {
  People,
  Receipt,
  Payment,
  Brightness4,
  Brightness7,
  Logout,
  ChevronLeft,
  Wallet,
  AccountBalanceWallet,
  TrendingUp,
  CreditScore,
} from "@mui/icons-material";
import { useDataStore } from "@/store/useDataStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { formatCurrency } from "@/utils/calculations";
import { useMemo } from "react";

export const HomePage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { payments, clients, standaloneDebts } = useDataStore();
  const { user, logout } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();

  const stats = useMemo(() => {
    const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);
    const totalDebts = standaloneDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
    const clientsCount = clients.length;

    return { totalPaid, totalDebts, clientsCount };
  }, [payments, clients, standaloneDebts]);

  const menuItems = [
    {
      title: "العملاء",
      subtitle: `${stats.clientsCount} عميل`,
      icon: People,
      path: "/clients",
      gradient: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
    },
    {
      title: "الفواتير",
      subtitle: "إدارة الفواتير",
      icon: Receipt,
      path: "/invoices",
      gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    },
    {
      title: "المدفوعات",
      subtitle: formatCurrency(stats.totalPaid),
      icon: Payment,
      path: "/payments",
      gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    },
    {
      title: "الديون",
      subtitle: formatCurrency(stats.totalDebts),
      icon: CreditScore,
      path: "/debts",
      gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: theme.palette.mode === "dark" 
          ? "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)" 
          : "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",
        pb: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
          pt: 4,
          pb: 6,
          px: 2,
          borderRadius: "0 0 32px 32px",
          boxShadow: "0 8px 32px rgba(99, 102, 241, 0.25)",
        }}
      >
        <Container maxWidth="sm">
          {/* Top Bar */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 4 }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  width: 52,
                  height: 52,
                  bgcolor: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  fontSize: "1.3rem",
                  fontWeight: 800,
                  border: "2px solid rgba(255,255,255,0.3)",
                }}
              >
                {user?.displayName?.charAt(0) ||
                  user?.email.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: "0.75rem",
                    mb: 0.3,
                    letterSpacing: 0.5,
                  }}
                >
                  مرحباً بك 👋
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: "white", fontWeight: 700, fontSize: "1.1rem" }}
                >
                  {user?.displayName || user?.email.split("@")[0]}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <IconButton
                onClick={toggleTheme}
                sx={{
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                }}
              >
                {mode === "dark" ? (
                  <Brightness7 sx={{ fontSize: 22 }} />
                ) : (
                  <Brightness4 sx={{ fontSize: 22 }} />
                )}
              </IconButton>
              <IconButton
                onClick={handleLogout}
                sx={{
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  "&:hover": { bgcolor: "rgba(239,68,68,0.3)" },
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                }}
              >
                <Logout sx={{ fontSize: 22 }} />
              </IconButton>
            </Stack>
          </Stack>

          {/* Balance Card */}
          <Card
            sx={{
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 4,
              color: "white",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              overflow: "visible",
            }}
          >
            <CardContent sx={{ py: 3.5, px: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 3,
                    bgcolor: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                  }}
                >
                  <AccountBalanceWallet sx={{ fontSize: 32 }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      opacity: 0.85,
                      fontSize: "0.8rem",
                      mb: 0.5,
                      letterSpacing: 0.3,
                    }}
                  >
                    إجمالي المدفوعات
                  </Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -0.5 }}>
                    {formatCurrency(stats.totalPaid)}
                  </Typography>
                </Box>
                <Chip
                  icon={<TrendingUp sx={{ fontSize: 16, color: "#10b981 !important" }} />}
                  label="نشط"
                  size="small"
                  sx={{
                    bgcolor: "rgba(16, 185, 129, 0.2)",
                    color: "#6ee7b7",
                    fontWeight: 600,
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="sm" sx={{ mt: -3, position: "relative", zIndex: 1 }}>
        {/* Quick Stats */}
        <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
          <Card
            sx={{
              flex: 1,
              borderRadius: 3,
              boxShadow: theme.palette.mode === "dark" 
                ? "0 4px 20px rgba(0,0,0,0.4)" 
                : "0 4px 20px rgba(0,0,0,0.08)",
              border: theme.palette.mode === "dark" ? "1px solid rgba(255,255,255,0.1)" : "none",
            }}
          >
            <CardContent sx={{ py: 2.5, textAlign: "center" }}>
              <Typography variant="h5" fontWeight={800} color="primary.main">
                {stats.clientsCount}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                عميل
              </Typography>
            </CardContent>
          </Card>
          <Card
            sx={{
              flex: 1,
              borderRadius: 3,
              boxShadow: theme.palette.mode === "dark" 
                ? "0 4px 20px rgba(0,0,0,0.4)" 
                : "0 4px 20px rgba(0,0,0,0.08)",
              border: theme.palette.mode === "dark" ? "1px solid rgba(255,255,255,0.1)" : "none",
            }}
          >
            <CardContent sx={{ py: 2.5, textAlign: "center" }}>
              <Typography variant="h5" fontWeight={800} color="warning.main">
                {formatCurrency(stats.totalDebts)}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                ديون نشطة
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        {/* Menu Section */}
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{ mb: 3, px: 0.5, color: "text.primary" }}
        >
          القوائم الرئيسية
        </Typography>

        <Stack spacing={2}>
          {menuItems.map((item, index) => (
            <Card
              key={index}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 4,
                boxShadow: theme.palette.mode === "dark" 
                  ? "0 4px 20px rgba(0,0,0,0.4)" 
                  : "0 4px 20px rgba(0,0,0,0.08)",
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                border: theme.palette.mode === "dark" ? "1px solid rgba(255,255,255,0.08)" : "none",
                overflow: "hidden",
                "&:hover": {
                  transform: "translateY(-4px) scale(1.01)",
                  boxShadow: theme.palette.mode === "dark" 
                    ? "0 12px 40px rgba(0,0,0,0.5)" 
                    : "0 12px 40px rgba(0,0,0,0.15)",
                },
                "&:active": {
                  transform: "scale(0.98)",
                },
              }}
            >
              <CardContent sx={{ p: 0 }}>
                <Stack direction="row" alignItems="stretch">
                  <Box
                    sx={{
                      width: 80,
                      background: item.gradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      py: 3,
                    }}
                  >
                    <item.icon sx={{ fontSize: 32, color: "white" }} />
                  </Box>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ flexGrow: 1, px: 2.5, py: 2 }}
                  >
                    <Box>
                      <Typography variant="body1" fontWeight={700} sx={{ mb: 0.3 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {item.subtitle}
                      </Typography>
                    </Box>
                    <ChevronLeft sx={{ color: "text.secondary", fontSize: 24 }} />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {/* Footer */}
        <Box sx={{ textAlign: "center", mt: 5, opacity: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            DebtFlow Pro © 2024
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
