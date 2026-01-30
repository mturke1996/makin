import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  InputAdornment,
  IconButton,
  Stack,
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, error, clearError, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      await login(data.email, data.password);
      navigate('/');
    } catch (error) {
      // Error is handled in the store
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Cairo", sans-serif'
      }}
    >
      {/* Vibrant Background Blobs */}
      <Box sx={{ 
        position: 'absolute', top: -150, right: -150, width: 500, height: 500, 
        borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', 
        filter: 'blur(100px)', opacity: 0.15 
      }} />
      <Box sx={{ 
        position: 'absolute', bottom: -120, left: -120, width: 400, height: 400, 
        borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6 0%, #d8b4fe 100%)', 
        filter: 'blur(80px)', opacity: 0.12 
      }} />
      <Box sx={{ 
        position: 'absolute', top: '20%', left: '10%', width: 250, height: 250, 
        borderRadius: '50%', background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', 
        filter: 'blur(70px)', opacity: 0.08 
      }} />

      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Card
          sx={{
            borderRadius: 1, // Sharp consistent corners
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
            overflow: 'hidden'
          }}
        >
          {/* Accent Line */}
          <Box sx={{ height: 5, background: 'linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)' }} />
          
          <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box sx={{ 
                 width: 60, height: 60, mx: 'auto', mb: 2.5, 
                 borderRadius: 1, 
                 background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                 boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)'
              }}>
                  <LoginIcon sx={{ fontSize: 32, color: 'white' }} />
              </Box>
              <Typography variant="h4" fontWeight={900} color="primary.main" gutterBottom sx={{ letterSpacing: '-1px' }}>
                شركة مكين
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                منظومة إدارة الخدمات الهندسية والمقاولات
              </Typography>
            </Box>

            {error && (
              <Alert 
                severity="error" 
                variant="filled"
                sx={{ 
                  mb: 3, borderRadius: 1, 
                  fontWeight: 600,
                  bgcolor: '#ef4444',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                }}
              >
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    placeholder="البريد الإلكتروني"
                    type="email"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    autoComplete="email"
                    sx={{
                       mb: 2.5,
                       '& .MuiOutlinedInput-root': {
                          borderRadius: 1,
                          bgcolor: 'white',
                          transition: 'all 0.2s',
                          '&:hover fieldset': { borderColor: 'primary.light' },
                       },
                    }}
                  />
                )}
              />

              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    placeholder="كلمة المرور"
                    type={showPassword ? 'text' : 'password'}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    autoComplete="current-password"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            sx={{ color: 'text.secondary' }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                       mb: 4,
                       '& .MuiOutlinedInput-root': {
                          borderRadius: 1,
                          bgcolor: 'white',
                          transition: 'all 0.2s',
                          '&:hover fieldset': { borderColor: 'primary.light' },
                       },
                    }}
                  />
                )}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ 
                   py: 1.5,
                   borderRadius: 1,
                   fontSize: '1rem',
                   fontWeight: 800,
                   background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                   boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.4)',
                   '&:hover': {
                      background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                      boxShadow: '0 15px 25px -5px rgba(37, 99, 235, 0.5)',
                      transform: 'translateY(-1px)'
                   },
                   '&:active': { transform: 'translateY(0)' }
                }}
              >
                {isLoading ? 'جاري التحقق...' : 'دخول للمنظومة'}
              </Button>
            </form>

            <Box sx={{ mt: 5, p: 2, bgcolor: '#f1f5f9', borderRadius: 1, border: '1px solid #e2e8f0' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, fontWeight: 700 }}>
                💡 بيانات الدخول السريع:
              </Typography>
              <Stack spacing={0.5}>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  admin@makin.com
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700, fontFamily: 'monospace' }}>
                  كود الدخول: admin123
                </Typography>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Typography
          variant="body2"
          textAlign="center"
          sx={{ mt: 4, color: 'text.secondary', fontWeight: 600, opacity: 0.8 }}
        >
          © {new Date().getFullYear()} شركة مكين للمقاولات. جميع الحقوق محفوظة
        </Typography>
      </Container>
    </Box>
  );
};

