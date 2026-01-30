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
        background: 'radial-gradient(circle at 50% 10%, #1e40af 0%, #0f172a 60%, #020617 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Shapes */}
      <Box sx={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(37, 99, 235, 0.2)', filter: 'blur(80px)' }} />
      <Box sx={{ position: 'absolute', bottom: -100, right: -100, width: 300, height: 300, borderRadius: '50%', background: 'rgba(124, 58, 237, 0.15)', filter: 'blur(60px)' }} />

      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Card
          sx={{
            borderRadius: 5,
            bgcolor: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}
        >
          {/* Top Decorative Line */}
          <Box sx={{ height: 4, background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)' }} />
          
          <CardContent sx={{ p: 5 }}>
            <Box sx={{ textAlign: 'center', mb: 5 }}>
              <Box sx={{ 
                 width: 64, height: 64, mx: 'auto', mb: 2, 
                 borderRadius: 3, 
                 background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                 boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)'
              }}>
                  <LoginIcon sx={{ fontSize: 32, color: 'white' }} />
              </Box>
              <Typography variant="h4" fontWeight={900} color="white" gutterBottom sx={{ letterSpacing: '-0.5px' }}>
                مكين
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                نظام إدارة الحسابات المتين
              </Typography>
            </Box>

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3, borderRadius: 2, 
                  bgcolor: 'rgba(239, 68, 68, 0.1)', 
                  color: '#fca5a5', 
                  border: '1px solid rgba(239, 68, 68, 0.2)' 
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
                    margin="none"
                    autoComplete="email"
                    sx={{
                       mb: 2.5,
                       '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(0,0,0,0.2)',
                          borderRadius: 2.5,
                          color: 'white',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                       },
                       '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.3)', opacity: 1 }
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
                    margin="none"
                    autoComplete="current-password"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            sx={{ color: 'rgba(255,255,255,0.5)' }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                       mb: 4,
                       '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(0,0,0,0.2)',
                          borderRadius: 2.5,
                          color: 'white',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                          '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                       },
                       '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.3)', opacity: 1 }
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
                   py: 1.8,
                   borderRadius: 2.5,
                   fontSize: '1rem',
                   fontWeight: 700,
                   background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                   boxShadow: '0 8px 20px -4px rgba(59, 130, 246, 0.6)',
                   '&:hover': {
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      boxShadow: '0 12px 25px -4px rgba(59, 130, 246, 0.8)',
                   }
                }}
              >
                {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
              </Button>
            </form>

            <Box sx={{ mt: 4, p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}>
                بيانات الدخول التجريبي:
              </Typography>
              <Stack direction="row" justifyContent="space-between">
                 <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>admin@makin.com</Typography>
                 <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>admin123</Typography>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Typography
          variant="body2"
          textAlign="center"
          sx={{ mt: 4, color: 'rgba(255,255,255,0.4)' }}
        >
          © 2024 Makin Company. جميع الحقوق محفوظة
        </Typography>
      </Container>
    </Box>
  );
};

