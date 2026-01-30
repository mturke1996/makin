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
} from "@mui/material";
import {
  People,
  Receipt,
  Payment,
  Brightness4,
  Brightness7,
  Logout,
  ChevronLeft,
  TrendingUp,
} from "@mui/icons-material";
import { useDataStore } from "@/store/useDataStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { formatCurrency } from "@/utils/calculations";
import { useMemo, useEffect, useState } from "react";

export const HomePage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { payments, clients, expenses } = useDataStore();
  const { user, logout } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();
  const [profitRecalcTrigger, setProfitRecalcTrigger] = useState(0);

  // Listen for storage changes to update profit calculation
  useEffect(() => {
    const handleStorageChange = () => {
      // Force re-render by updating state
      setProfitRecalcTrigger((prev) => prev + 1);
    };
    window.addEventListener("storage", handleStorageChange);
    // Also listen for custom event for same-window updates
    window.addEventListener("profitPercentageUpdated", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "profitPercentageUpdated",
        handleStorageChange
      );
    };
  }, []);

  const stats = useMemo(() => {
    const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);
    const clientsCount = clients.length;

    // Calculate profit for each client separately
    // Each client has their own percentage stored in database
    const totalProfit = clients.reduce((totalProfit, client) => {
      const clientPercentage = client.profitPercentage;
      if (
        !clientPercentage ||
        isNaN(clientPercentage) ||
        clientPercentage <= 0
      ) {
        return totalProfit;
      }

      // Get expenses for this client only
      const clientExpenses = expenses.filter(
        (exp) => exp.clientId === client.id
      );
      const clientTotalExpenses = clientExpenses.reduce(
        (sum, exp) => sum + exp.amount,
        0
      );
      const clientProfit = (clientTotalExpenses * clientPercentage) / 100;

      return totalProfit + clientProfit;
    }, 0);

    return { totalPaid, clientsCount, profit: totalProfit };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, clients, expenses, profitRecalcTrigger]);

  const menuItems = [
    {
      title: "العملاء",
      icon: People,
      path: "/clients",
      color: "#ec4899",
      bgColor:
        theme.palette.mode === "dark" ? "rgba(236, 72, 153, 0.2)" : "#fce7f3",
    },
    {
      title: "الفواتير",
      icon: Receipt,
      path: "/invoices",
      color: "#3b82f6",
      bgColor:
        theme.palette.mode === "dark" ? "rgba(59, 130, 246, 0.2)" : "#dbeafe",
    },
    {
      title: "المدفوعات",
      icon: Payment,
      path: "/payments",
      color: "#10b981",
      bgColor:
        theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.2)" : "#d1fae5",
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
        background: theme.palette.mode === "dark" ? "#0f172a" : "#f8fafc",
        pb: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          pt: 3,
          pb: 4,
          px: 2,
        }}
      >
        <Container maxWidth="sm">
          {/* Top Bar */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 3 }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                sx={{
                  width: 45,
                  height: 45,
                  bgcolor: "rgba(255,255,255,0.25)",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                }}
              >
                {user?.displayName?.charAt(0) ||
                  user?.email.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255,255,255,0.8)", fontSize: "0.8rem" }}
                >
                  مرحباً
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: "white", fontWeight: 700, fontSize: "1rem" }}
                >
                  {user?.displayName || user?.email.split("@")[0]}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={3}>
              <IconButton
                onClick={toggleTheme}
                sx={{
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                }}
                size="medium"
              >
                {mode === "dark" ? (
                  <Brightness7 fontSize="small" />
                ) : (
                  <Brightness4 fontSize="small" />
                )}
              </IconButton>
              <IconButton
                onClick={handleLogout}
                sx={{
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                }}
                size="medium"
              >
                <Logout fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          {/* Title */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography
              variant="h4"
              sx={{
                color: "white",
                fontWeight: 900,
                mb: 0.5,
                fontSize: { xs: "1.5rem", sm: "2rem" },
                letterSpacing: 0.5,
                textShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              شركة مكين
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "rgba(255,255,255,0.95)",
                fontWeight: 500,
                fontSize: { xs: "0.875rem", sm: "1rem" },
                letterSpacing: 0.3,
              }}
            >
              للخدمات الهندسية والإنشاءات
            </Typography>
          </Box>

          {/* Profit Card */}
          <Card
            sx={{
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 3,
              color: "white",
              boxShadow: "none",
            }}
          >
            <CardContent sx={{ py: 2.5 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.9, fontSize: "0.75rem" }}
                  >
                    إجمالي الأرباح
                  </Typography>
                  <Typography variant="h5" fontWeight={900}>
                    {formatCurrency(stats.profit)}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.8,
                      fontSize: "0.7rem",
                      mt: 0.5,
                      display: "block",
                    }}
                  >
                    من جميع العملاء
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: 2.5,
                    bgcolor: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <TrendingUp sx={{ fontSize: 28 }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="sm" sx={{ mt: -2 }}>
        {/* Menu Section */}
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ mb: 2, px: 0.5, mt: 3 }}
        >
          القوائم الرئيسية
        </Typography>

        <Stack spacing={2.5}>
          {menuItems.map((item, index) => (
            <Card
              key={index}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 3,
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                border:
                  theme.palette.mode === "dark"
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "1px solid rgba(0,0,0,0.02)",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
                },
                "&:active": {
                  transform: "scale(0.98)",
                },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Stack direction="row" spacing={0} alignItems="center">
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        bgcolor: item.bgColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        ml: 2.5, // Explicit margin from the circle to the text
                      }}
                    >
                      <item.icon sx={{ fontSize: 28, color: item.color }} />
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
                  <ChevronLeft sx={{ color: "text.secondary" }} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {/* Footer */}
        <Box sx={{ textAlign: "center", mt: 4, opacity: 0.6 }}>
          <Typography variant="caption" color="text.secondary">
            شركة مكين للخدمات الهندسية © 2024
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
