import { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  Stack,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Avatar,
  Divider,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Security,
  Person,
  Mail,
  VpnKey,
  Block,
} from "@mui/icons-material";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useDataStore } from "@/store/useDataStore";
import { useAuthStore } from "@/store/useAuthStore";
import { User } from "@/types";
import toast from "react-hot-toast";

// Firebase config for secondary app (needed to create users without logging out)
const firebaseConfig = {
  apiKey: "AIzaSyBHqHGoSFPlmftQiF2m1EQ7RMtLsC0qGQM",
  authDomain: "makin-e91d0.firebaseapp.com",
  projectId: "makin-e91d0",
  storageBucket: "makin-e91d0.firebasestorage.app",
  messagingSenderId: "801758923710",
  appId: "1:801758923710:web:08ae347e4907f421d647ef",
};

export const SettingsPage = () => {
  const { users, addUser, updateUser, deleteUser } = useDataStore();
  const currentUser = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    email: "",
    displayName: "",
    role: "user",
    status: "active",
  });


  const handleOpen = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({ ...user });
    } else {
      setEditingUser(null);
      setFormData({
        email: "",
        displayName: "",
        role: "user",
        status: "active",
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingUser(null);
  };

  const handleSave = async () => {
    if (!formData.email) {
      toast.error("يرجى إدخال البريد الإلكتروني");
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error("يرجى إدخال كلمة المرور للمستخدم الجديد");
      return;
    }

    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData);
        toast.success("تم تحديث المستخدم بنجاح");
      } else {
        try {
          const secondaryApp = initializeApp(firebaseConfig, "secondary");
          const secondaryAuth = getAuth(secondaryApp);
          const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            formData.email!,
            formData.password!
          );
          
          const userData = {
            ...formData,
            id: userCredential.user.uid,
          };
          
          await addUser(userData as User);
          toast.success("تم إضافة المستخدم وحسابه بنجاح");
          await deleteApp(secondaryApp);
        } catch (authError: any) {
          console.error("Auth error:", authError);
          if (authError.code === "auth/email-already-in-use") {
            toast.error("هذا البريد الإلكتروني مسجل مسبقاً");
          } else {
            toast.error("خطأ في إنشاء حساب المستخدم: " + authError.message);
          }
          return;
        }
      }
      handleClose();
    } catch (error) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
      try {
        await deleteUser(id);
        toast.success("تم حذف المستخدم");
      } catch (error) {
        toast.error("حدث خطأ أثناء الحذف");
      }
    }
  };

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      bgcolor: "background.default", 
      py: 6,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Background Elements */}
      <Box sx={{ 
        position: 'absolute', top: -100, right: -100, width: 400, height: 400, 
        borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', filter: 'blur(80px)',
        zIndex: 0
      }} />
      <Box sx={{ 
        position: 'absolute', bottom: -100, left: -100, width: 300, height: 300, 
        borderRadius: '50%', background: 'rgba(124, 58, 237, 0.08)', filter: 'blur(60px)',
        zIndex: 0
      }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 6 }}>
          <Box>
            <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1, color: "primary.main", mb: 1 }}>إدارة المستخدمين</Typography>
            <Typography variant="body1" color="text.secondary" fontWeight={500}>إضافة وتعديل أعضاء فريق العمل والمسؤولين</Typography>
          </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpen()}
              sx={{ 
                  borderRadius: 1, px: 4, py: 1.2,
                  fontWeight: 700,
                  boxShadow: 'none',
                  '&:hover': { boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)' }
              }}
            >
              إضافة مستخدم جديد
            </Button>
        </Stack>

        <Grid container spacing={3}>
           {users.map((user) => (
             <Grid size={{ xs: 12, md: 6 }} key={user.id}>
                <Card sx={{ 
                    borderRadius: 1, 
                    p: 0,
                    overflow: 'hidden',
                    background: theme => theme.palette.background.paper,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 'none',
                    transition: 'none',
                    '&:hover': { borderColor: 'primary.main' }
                }}>
                    <Box sx={{ p: 3 }}>
                      <Stack direction="row" spacing={3} alignItems="center">
                          <Avatar sx={{ 
                              width: 60, height: 60, 
                              borderRadius: 1,
                              background: user.role === 'admin' ? theme => theme.palette.error.main : theme => theme.palette.primary.main,
                              color: 'white',
                              fontWeight: 700,
                              fontSize: '1.2rem',
                          }}>
                              {user.displayName?.charAt(0) || <Person />}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                  <Typography variant="h6" fontWeight={900} sx={{ color: 'text.primary' }}>{user.displayName || 'بدون اسم'}</Typography>
                                  <Chip 
                                      label={user.role === 'admin' ? 'مدير نظام' : user.role === 'manager' ? 'مدير حسابات' : 'مستخدم'} 
                                      sx={{ 
                                        fontWeight: 700, 
                                        borderRadius: 0.5,
                                        bgcolor: user.role === 'admin' ? 'error.light' : 'primary.light',
                                        color: user.role === 'admin' ? 'error.contrastText' : 'primary.contrastText',
                                        fontSize: '0.7rem'
                                      }}
                                  />
                              </Stack>
                              <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 2 }}>{user.email}</Typography>
                              
                              <Stack direction="row" spacing={1.5}>
                                  <Chip 
                                      label={user.status === 'inactive' ? 'معطل' : 'حساب نشط'} 
                                      color={user.status === 'inactive' ? 'default' : 'success'}
                                      size="small"
                                      sx={{ fontWeight: 700, borderRadius: 0.5 }}
                                  />
                              </Stack>
                          </Box>
                      </Stack>
                    </Box>
                    <Divider sx={{ opacity: 0.5 }} />
                    <Stack direction="row" sx={{ p: 1.2, bgcolor: 'background.subtle' }} spacing={1} justifyContent="flex-end">
                        <Button 
                          size="small" 
                          startIcon={<Edit />} 
                          onClick={() => handleOpen(user)}
                          sx={{ borderRadius: 1, fontWeight: 700 }}
                        >
                          تعديل
                        </Button>
                        <Button 
                          size="small" 
                          color="error" 
                          startIcon={<Delete />} 
                          onClick={() => handleDelete(user.id)}
                          sx={{ borderRadius: 1, fontWeight: 700 }}
                        >
                          حذف
                        </Button>
                    </Stack>
                </Card>
             </Grid>
           ))}
        </Grid>
      </Container>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, px: 4, pt: 4 }}>
          {editingUser ? "تعديل بيانات المستخدم" : "إضافة مستخدم جديد"}
        </DialogTitle>
        <DialogContent sx={{ px: 4, pt: 2 }}>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="الاسم الكامل"
              fullWidth
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />
            <TextField
              label="البريد الإلكتروني"
              fullWidth
              disabled={!!editingUser}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
              InputProps={{ startAdornment: <Mail fontSize="small" sx={{ mr: 1, color: 'text.disabled' }} /> }}
            />
            {!editingUser && (
              <TextField
                label="كلمة المرور"
                fullWidth
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                InputProps={{ startAdornment: <VpnKey fontSize="small" sx={{ mr: 1, color: 'text.disabled' }} /> }}
              />
            )}
            <FormControl fullWidth>
                <InputLabel>دور المستخدم</InputLabel>
                <Select
                    value={formData.role || 'user'}
                    label="دور المستخدم"
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    sx={{ borderRadius: 1 }}
                >
                    <MenuItem value="admin">مدير نظام (مسؤول)</MenuItem>
                    <MenuItem value="manager">مدير حسابات (إداري)</MenuItem>
                    <MenuItem value="user">موظف (مستخدم)</MenuItem>
                </Select>
            </FormControl>
            <FormControlLabel
                control={
                  <Switch 
                    checked={formData.status !== 'inactive'} 
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'active' : 'inactive' })} 
                    color="success" 
                  />
                }
                label={<Typography fontWeight={700}>حالة الحساب (نشط)</Typography>}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 4 }}>
          <Button onClick={handleClose} color="inherit" sx={{ fontWeight: 700, borderRadius: 1 }}>إلغاء</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            sx={{ borderRadius: 1, px: 6, fontWeight: 700 }}
          >
            {editingUser ? "حفظ التعديلات" : "إنشاء الحساب"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
