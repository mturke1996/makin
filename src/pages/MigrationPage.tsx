import { useState } from 'react';
import { Box, Button, Card, CardContent, Container, Typography, LinearProgress, Paper } from '@mui/material';
import { migrateData } from '../utils/migrationTool';
import { CloudUpload } from '@mui/icons-material';

const MigrationPage = () => {
  const [status, setStatus] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleMigration = async () => {
    setIsLoading(true);
    setStatus(['بدء عملية النقل...']);
    
    await migrateData((msg) => {
      setStatus(prev => [...prev, msg]);
    });
    
    setIsLoading(false);
  };

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Card sx={{ borderRadius: 4, textAlign: 'center', p: 4 }}>
        <CardContent>
          <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" fontWeight={800} gutterBottom>
            نقل البيانات من القاعدة القديمة
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            سيقوم هذا المعالج بسحب جميع البيانات (العملاء، الفواتير، إلخ) من مشروع "DebtFlow Pro" القديم وإضافتها إلى قاعدة بيانات "شركة مكين" الجديدة.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={handleMigration}
            disabled={isLoading}
            sx={{ px: 6, py: 1.5, borderRadius: 3, fontSize: '1.rem' }}
          >
            {isLoading ? 'جاري العمل...' : 'بدء النقل الآن'}
          </Button>

          {isLoading && <LinearProgress sx={{ mt: 4, borderRadius: 2 }} />}

          <Paper sx={{ mt: 4, p: 2, bgcolor: 'action.hover', maxHeight: 300, overflow: 'auto', textAlign: 'left' }} dir="ltr">
            {status.map((msg, idx) => (
              <Typography key={idx} variant="caption" display="block" sx={{ mb: 0.5, fontFamily: 'monospace' }}>
                {msg}
              </Typography>
            ))}
          </Paper>
        </CardContent>
      </Card>
    </Container>
  );
};

export default MigrationPage;
