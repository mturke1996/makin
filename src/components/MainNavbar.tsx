import { AppBar, Toolbar, Typography, Button, IconButton, Box, Container, Stack, Avatar, useTheme, Tooltip } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  Settings, 
  Backup, 
  Logout, 
  Brightness4, 
  Brightness7,
  ArrowBack
} from "@mui/icons-material";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";

export const MainNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const { user, logout } = useAuthStore();
    const { mode, toggleTheme } = useThemeStore();

    const isHome = location.pathname === "/";

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <AppBar 
            position="sticky" 
            elevation={0}
            sx={{ 
                bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid',
                borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                color: 'text.primary',
                zIndex: theme.zIndex.drawer + 1
            }}
        >
            <Container maxWidth="lg">
                <Toolbar disableGutters sx={{ height: 70 }}>
                    {!isHome && (
                        <IconButton 
                            onClick={() => navigate(-1)} 
                            sx={{ 
                                ml: 2, 
                                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                '&:hover': { bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }
                            }}
                        >
                            <ArrowBack />
                        </IconButton>
                    )}

                    <Stack 
                        direction="row" 
                        alignItems="center" 
                        spacing={1} 
                        sx={{ cursor: 'pointer', flexGrow: 1 }}
                        onClick={() => navigate("/")}
                    >
                        <Avatar 
                            variant="rounded"
                            sx={{ 
                                bgcolor: 'primary.main', 
                                width: 35, 
                                height: 35,
                                fontWeight: 900,
                                fontSize: '1.2rem'
                            }}
                        >
                            M
                        </Avatar>
                        <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '-0.5px', display: { xs: 'none', sm: 'block' } }}>
                            شركة مكين
                        </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title="الرئيسية">
                            <IconButton onClick={() => navigate("/")} color={isHome ? "primary" : "inherit"}>
                                <Home />
                            </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="الإعدادات">
                            <IconButton onClick={() => navigate("/settings")} color={location.pathname === "/settings" ? "primary" : "inherit"}>
                                <Settings />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="النسخ الاحتياطي">
                            <IconButton onClick={() => navigate("/backup")} color={location.pathname === "/backup" ? "primary" : "inherit"}>
                                <Backup />
                            </IconButton>
                        </Tooltip>

                        <IconButton onClick={toggleTheme}>
                            {mode === 'dark' ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
                        </IconButton>

                        <Box sx={{ width: 1, height: 24, bgcolor: 'divider', mx: 1 }} />

                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ ml: 1 }}>
                            <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', lineHeight: 1 }}>مرحباً،</Typography>
                                <Typography variant="body2" fontWeight={800}>{user?.displayName?.split(' ')[0] || "المسؤول"}</Typography>
                            </Box>
                            <IconButton onClick={handleLogout} color="error">
                                <Logout fontSize="small" />
                            </IconButton>
                        </Stack>
                    </Stack>
                </Toolbar>
            </Container>
        </AppBar>
    );
};
